import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  //  This client is only kept here in case you use cookies later
  createServerClient(
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

  //  This is enough for now — don't redirect based on session
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
