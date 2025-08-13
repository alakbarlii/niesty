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

  const s = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1) Try waitlist (case-insensitive)
  const { data: wl, error: wlErr } = await s
    .from('waitlist')
    .select('id, role, full_name')
    .ilike('email', email)  // case-insensitive
    .limit(1);

  if (wlErr) return bad(wlErr.message, 500);
  const w = (wl ?? [])[0];
  if (w) {
    return NextResponse.json(
      { ok: true, role: w.role ?? null, full_name: w.full_name ?? null },
      { status: 200 }
    );
  }

  // 2) Fallback: if a profile already exists, allow login (grandfathered users)
  const { data: pf, error: pfErr } = await s
    .from('profiles')
    .select('id, role, full_name')
    .ilike('email', email)
    .limit(1);

  if (pfErr) return bad(pfErr.message, 500);
  const p = (pf ?? [])[0];
  if (p) {
    return NextResponse.json(
      { ok: true, role: p.role ?? null, full_name: p.full_name ?? null },
      { status: 200 }
    );
  }

  // Not allowed
  return NextResponse.json({ ok: false }, { status: 200 });
}