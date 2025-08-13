// app/api/admin/waitlist/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type WaitlistRow = {
  id: string;
  email: string | null;
  role: string | null;
  reg_time: string; // timestamptz
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars (URL or SERVICE ROLE KEY)' },
      { status: 500 }
    );
  }

  // Server-only client with service role (bypasses RLS)
  const s = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await s
    .from('waitlist')
    .select('id,email,role,reg_time')
    .order('reg_time', { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as WaitlistRow[] }, { status: 200 });
}