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
  if (process.env.NEXT_PUBLIC_FEATURE_TURNSTILE !== '1') return; // skip in dev if disabled
  if (!token) throw new Error('Captcha token missing');

  const secret = process.env.CAPTCHA_SECRET_KEY;
  if (!secret) throw new Error('Server misconfigured: CAPTCHA_SECRET_KEY missing');

  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = await r.json();
  if (!data.success) throw new Error('Captcha failed');
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for');
    const { email, full_name, role, token } = (await req.json()) as Body;

    const normalized = (email || '').trim().toLowerCase();
    if (!normalized || !full_name?.trim() || !role) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    await verifyTurnstile(token, ip); // throws if invalid

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin
      .from('waitlist')
      .upsert({ email: normalized, full_name, role }, { onConflict: 'email' });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
