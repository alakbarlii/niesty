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

  //  Protect these routes
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

  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url));
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
  