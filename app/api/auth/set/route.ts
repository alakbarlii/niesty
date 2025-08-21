// app/api/auth/set/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SetBody = { access_token: string; refresh_token: string };

export async function GET() {
  return NextResponse.json({ ok: true, note: 'Use POST to set auth cookies.' }, { status: 200 });
}
export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = (await req.json()) as Partial<SetBody>;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ ok: false, error: 'Missing tokens' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { res.cookies.set(name, value, options); },
        remove(name: string, options: CookieOptions) { res.cookies.set(name, '', { ...options, maxAge: -1 }); },
      },
    }
  );

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return res;
}
