// app/api/bootstrap-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure Node runtime so env + service key are available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BootstrapBody = {
  email?: string;
  full_name?: string | null;
  role?: string | null;
};

function isBootstrapBody(value: unknown): value is BootstrapBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const okEmail = v.email === undefined || typeof v.email === 'string';
  const okName = v.full_name === undefined || v.full_name === null || typeof v.full_name === 'string';
  const okRole = v.role === undefined || v.role === null || typeof v.role === 'string';
  return okEmail && okName && okRole;
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: missing Supabase env vars' },
        { status: 500 }
      );
    }

    // 1) Validate caller: must provide a Supabase session JWT
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Admin client (server-side, bypasses RLS safely)
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 3) Parse and validate JSON body
    let rawBody: unknown = null;
    try {
      rawBody = await req.json();
    } catch {
      // allow empty body
      rawBody = null;
    }
    const body: BootstrapBody = isBootstrapBody(rawBody) ? rawBody : {};

    const user = userData.user;
    const email = (body.email ?? user.email ?? '').toLowerCase();
    const full_name = body.full_name ?? (user.user_metadata?.name ?? null);
    const role = body.role ?? null;

    // 4) Upsert profile (one row per user_id)
    const { error: upsertErr } = await admin
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          email,
          full_name,
          role,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}