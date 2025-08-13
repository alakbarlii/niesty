// app/api/admin/deals/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase env vars (URL or SERVICE ROLE KEY)' },
        { status: 500 }
      );
    }

    // Server-side client with Service Role (bypasses RLS). Safe here only.
    const s = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1) Fetch deals (lean fields, ordered, capped)
    const { data: deals, error: dErr } = await s
      .from('deals')
      .select('id, deal_id, sender_id, receiver_id, deal_value, deal_stage, created_at, message')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 });
    }

    // 2) Collect unique participant IDs (avoid empty IN())
    const ids = Array.from(
      new Set((deals ?? []).flatMap(d => [d.sender_id, d.receiver_id]).filter(Boolean))
    );

    let profileMap = new Map<string, { full_name: string | null; role: string | null }>();
    if (ids.length > 0) {
      const { data: profiles, error: pErr } = await s
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', ids);

      if (pErr) {
        return NextResponse.json({ error: pErr.message }, { status: 500 });
      }

      profileMap = new Map(
        (profiles ?? []).map(p => [p.user_id as string, { full_name: p.full_name, role: p.role }])
      );
    }

    // 3) Enrich deals with participant names/roles
    const enriched = (deals ?? []).map(d => ({
      ...d,
      sender_name: profileMap.get(d.sender_id)?.full_name ?? 'Unknown',
      receiver_name: profileMap.get(d.receiver_id)?.full_name ?? 'Unknown',
      sender_role: profileMap.get(d.sender_id)?.role ?? null,
      receiver_role: profileMap.get(d.receiver_id)?.role ?? null,
    }));

    return NextResponse.json({ data: enriched }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch admin deals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}