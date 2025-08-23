// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Create a response we can attach headers to for ALL requests
  const res = NextResponse.next()

  // --- Security Headers (global) ---
  // (Applied to all routes matched by config.matcher)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  // 1 week HSTS; increase after verifying HTTPS everywhere
  res.headers.set('Strict-Transport-Security', 'max-age=604800; includeSubDomains')
  // Baseline CSP (safe starter; tighten later if you remove inline/eval)
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
      "connect-src 'self' https: wss:",
      "font-src 'self' https: data:",
      "media-src 'self' https: blob:",
    ].join('; ')
  )

  // --- Auth guard only for protected areas ---
  const needsAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  if (!needsAuth) {
    // Not a protected path → just return the secured response
    return res
  }

  // For protected paths, verify Supabase session (server-side)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set(name, '', { ...options, maxAge: -1 })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Auth OK → proceed with secured response
  return res
}

// Run on all pages except static assets and Next image routes.
// This lets us add security headers globally while only auth-gating
// /dashboard and /admin inside the middleware function.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
}
