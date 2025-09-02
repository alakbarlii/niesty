// app/api/secops/log/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Body = {
  userId?: string | null;
  route: string;
  reason: string;
  ip?: string | null;
  severity?: 'info' | 'warning' | 'high' | 'critical';
  meta?: Record<string, unknown> | null;
};

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-secops-key') || '';
    if (!process.env.SECOPS_INTERNAL_KEY || secret !== process.env.SECOPS_INTERNAL_KEY) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId = null, route, reason, ip = null, severity = 'warning', meta = null } =
      (await req.json()) as Body;

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { error } = await admin.rpc('secops_log_event', {
      p_user_id: userId,
      p_route: route,
      p_reason: reason,
      p_ip: ip,
      p_severity: severity,
      p_meta: meta,
    });

    if (error) {
      console.error('[secops log] rpc error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[secops log] exception:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}