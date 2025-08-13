// app/api/admin/waitlist/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'creator' | 'business' | null;

export interface WaitlistRow {
  id: string;
  email: string | null;
  role: Role;
  full_name: string | null;
}

interface Ok<T> {
  ok: true;
  data: T;
}
interface Fail {
  ok: false;
  error: string;
}

function ok<T>(data: T, status = 200) {
  return NextResponse.json<Ok<T>>({ ok: true, data }, { status });
}
function fail(msg: string, status = 400) {
  return NextResponse.json<Fail>({ ok: false, error: msg }, { status });
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) return fail('Missing NEXT_PUBLIC_SUPABASE_URL', 500);
  if (!serviceKey) return fail('Missing SUPABASE_SERVICE_ROLE_KEY', 500);

  const s = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Select only columns that we KNOW exist on your table
  const { data, error } = await s
    .from('waitlist')
    .select('id,email,role,full_name')
    // UUIDs are unordered; this is still deterministic and avoids unknown timestamp cols
    .order('id', { ascending: false })
    .limit(1000);

  if (error) return fail(error.message, 500);
  return ok<WaitlistRow[]>(data ?? [], 200);
}