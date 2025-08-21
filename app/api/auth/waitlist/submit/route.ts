// app/api/waitlist/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  email?: string;
  full_name?: string;
  role?: 'creator' | 'business';
  token?: string; // Turnstile token
};

async function verifyTurnstile(token?: string, ip?: string | null) {
  // If feature flag is off, skip verification (keeps local/dev flexible)
  if (process.env.NEXT_PUBLIC_FEATURE_TURNSTILE !== '1') return;

  if (!token) throw new Error('Captcha token missing');

  const secret = process.env.CAPTCHA_SECRET_KEY;
  if (!secret) throw new Error('Server misconfigured: CAPTCHA_SECRET_KEY missing');

  const form = new URLSearchParams();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const data = await r.json();
  if (!data.success) throw new Error('Captcha failed');
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for');
    const body = (await req.json()) as Body;

    const email = (body.email || '').trim().toLowerCase();
    const full_name = body.full_name?.trim() || '';
    const role = body.role || null;

    if (!email || !full_name || !role) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify CAPTCHA (throws if invalid)
    await verifyTurnstile(body.token, ip);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Missing Supabase env vars' }, { status: 500 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Upsert by email (prevents duplicates; case-insensitive)
    const { error } = await admin
      .from('waitlist')
      .upsert(
        { email, full_name, role },
        { onConflict: 'email' }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
