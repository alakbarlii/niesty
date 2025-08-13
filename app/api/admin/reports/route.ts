// app/api/admin/reports/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ReportRow = {
  id: string;
  reported_user: string | null;
  message: string | null;
  created_at: string;
  reporter_id?: string | null; // if you added it
  status?: string | null;
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

  const s = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await s
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as ReportRow[] }, { status: 200 });
}