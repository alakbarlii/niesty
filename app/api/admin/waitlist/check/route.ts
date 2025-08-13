import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, error: 'Missing email' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Server misconfig' }, { status: 500 });
  }

  const s = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await s
    .from('waitlist')
    .select('id, role')
    .eq('email', email)
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const found = (data ?? [])[0];
  return NextResponse.json({ ok: !!found, role: found?.role ?? null });
}