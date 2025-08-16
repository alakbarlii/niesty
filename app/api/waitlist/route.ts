// app/api/waitlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type WaitlistRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'creator' | 'business' | null;
};

export const dynamic = 'force-dynamic'; // don't cache
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) return NextResponse.json({ ok: false });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // service-role bypasses RLS; never expose to client
  const s = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await s
    .from('waitlist')
    .select('id,email,full_name,role')
    .ilike('email', email)     // case-insensitive exact match
    .limit(1)
    .maybeSingle<WaitlistRow>();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }

  if (!data) return NextResponse.json({ ok: false });

  return NextResponse.json({
    ok: true,
    role: data.role,
    fullName: data.full_name,
  });
}