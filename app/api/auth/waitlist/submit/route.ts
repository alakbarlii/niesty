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
  if (process.env.NEXT_PUBLIC_FEATURE_TURNSTILE !== '1') {
    if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === '1') console.log('[WL] DEBUG: skipping captcha (flag off)');
    return;
  }
  if (!token) throw new Error('Captcha token missing');

  const secret = process.env.CAPTCHA_SECRET_KEY;
  if (!secret) throw new Error('Server misconfigured: CAPTCHA_SECRET_KEY missing');

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  if (ip) params.append('remoteip', ip);

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: params,
  });
  const data = await resp.json();

  if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === '1') {
    console.log('[WL] verifyTurnstile:', JSON.stringify(data));
  }

  if (!data.success) {
    throw new Error(`Captcha failed: ${data['error-codes']?.join(',') || 'unknown'}`);
  }
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
    if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === '1') console.error('[WL] ERROR', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
