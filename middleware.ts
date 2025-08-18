// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Never intercept auth or API — avoids breaking the callback exchange
  if (pathname.startsWith('/auth') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Guard only these sections (double-safety; matcher also restricts)
  const needsAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  if (!needsAuth) return NextResponse.next();

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

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // optional: return the user back after login
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};