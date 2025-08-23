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
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  // 1 week HSTS; increase after verifying HTTPS everywhere
  res.headers.set('Strict-Transport-Security', 'max-age=604800; includeSubDomains')

  // --- Content Security Policy (env-based) ---
  const isProd = process.env.NODE_ENV === 'production'

  // Development: allow inline/eval to move fast
  const cspDev = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
    // add exact hosts you call during dev if needed
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    "font-src 'self' https: data:",
    "media-src 'self' https: blob:",
  ].join('; ')

  // Production: strict (no inline/eval); whitelist only what we use
  const cspProd = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "style-src 'self' https:",
    "script-src 'self' https:",
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    "font-src 'self' https: data:",
    "media-src 'self' https: blob:",
  ].join('; ')

  res.headers.set('Content-Security-Policy', isProd ? cspProd : cspDev)

  // --- Host allowlist (blocks domain fronting) ---
  const host = (req.headers.get('host') || '').toLowerCase()
  const allowedHosts = [
    'localhost:3000',
    'niesty.vercel.app', // add your prod domain when you buy it
  ]
  if (!allowedHosts.includes(host)) {
    return new NextResponse('Forbidden host', { status: 403 })
  }

  // --- Same-origin protection for state-changing methods ---
  // Skip OPTIONS (preflight). If you add external webhooks later, add path exceptions.
  const method = req.method.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin') || ''
    const allowedOrigins = [
      'http://localhost:3000',
      'https://niesty.vercel.app', // add your prod origin
    ]

    // Example future exception:
    // const isStripeWebhook = pathname.startsWith('/api/webhooks/stripe')
    // if (!isStripeWebhook && !allowedOrigins.includes(origin)) ...

    if (!allowedOrigins.includes(origin)) {
      return new NextResponse('Bad origin', { status: 403 })
    }
  }

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
