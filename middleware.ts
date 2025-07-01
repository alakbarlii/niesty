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
  } = await supabase.auth.getSession();

  const protectedRoutes = [
    '/dashboard',
    '/deals',
    '/earnings',
    '/notifications',
    '/profile',
    '/report',
    '/search',
    '/settings',
  ];

  const isProtected = protectedRoutes.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  //  If not logged in, redirect to /login
  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If logged in, verify the user is in the waitlist
  if (session && isProtected) {
    const email = session.user.email;

    const { data: waitlistMatch, error } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error checking waitlist:', error);
      return NextResponse.redirect(new URL('/dashboard/unauthorized', req.url));
    }

    if (!waitlistMatch) {
      console.warn('Blocked unauthorized email:', email);
      return NextResponse.redirect(new URL('/dashboard/unauthorized', req.url));
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, name, social_links')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.redirect(new URL('/dashboard/settings', req.url));
    }

    const isProfileMissing =
      !profile ||
      !profile.name ||
      !profile.social_links ||
      Object.keys(profile.social_links).length === 0;

    const isNotOnSettingsPage = !req.nextUrl.pathname.startsWith('/dashboard/settings');

    if (isProfileMissing && isNotOnSettingsPage) {
      return NextResponse.redirect(new URL('/dashboard/settings', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/deals/:path*',
    '/earnings/:path*',
    '/notifications/:path*',
    '/profile/:path*',
    '/report/:path*',
    '/search/:path*',
    '/settings/:path*',
  ],
};
