import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set(name, '', { ...options, maxAge: -1 });
        },
      },
    }
  );

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // 🚫 If not logged in, force redirect to /login
  if (!session || sessionError) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Logged in. Now check if they're on the waitlist
  const { data: user, error: waitlistError } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (waitlistError || !user) {
    const waitlistUrl = new URL('/waitlist', req.url);
    return NextResponse.redirect(waitlistUrl);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
