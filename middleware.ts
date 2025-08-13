import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Build Supabase client bound to middleware cookies
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

  // Protect admin paths only
  const isAdminPath =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin/');

  if (!isAdminPath) {
    return res; // all other paths unchanged
  }

  // Require signed-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Require admin via RPC (uses the anon key + user session cookies)
  const { data: isAdmin, error } = await supabase.rpc('is_admin', { uid: user.id });
  if (error || !isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    // your existing protected app areas
    '/dashboard/:path*',
    '/deals/:path*',
    '/earnings/:path*',
    '/notifications/:path*',
    '/profile/:path*',
    '/report/:path*',
    '/search/:path*',
    '/settings/:path*',
    // NEW: admin gate
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};