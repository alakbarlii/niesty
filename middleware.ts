import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

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
    error,
  } = await supabase.auth.getSession();

  // If not logged in, redirect to login
  if (!session?.user || error) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname); // Optional
    return NextResponse.redirect(loginUrl);
  }

  // If logged in, check if user is in waitlist
  const { data: waitlistUser, error: waitlistError } = await supabase
    .from('waitlist')
    .select('email')
    .eq('email', session.user.email)
    .single();

  if (waitlistError || !waitlistUser) {
    return NextResponse.redirect(new URL('/waitlist', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
