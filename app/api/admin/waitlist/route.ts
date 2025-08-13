// app/api/waitlist/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return bad('Missing email');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return bad('Server misconfig', 500);

  // Service-role client (bypasses RLS) — safe on server only
  const s = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await s
    .from('waitlist')
    .select('id, role, full_name')
    .eq('email', email)
    .limit(1);

  if (error) return bad(error.message, 500);

  const row = (data ?? [])[0];
  return NextResponse.json(
    {
      ok: !!row,
      role: row?.role ?? null,
      full_name: row?.full_name ?? null,
    },
    { status: 200 }
  );
}