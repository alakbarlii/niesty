import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always create a response we can attach headers to
  const res = NextResponse.next()

  // Per-request nonce (kept for scripts; NOT enforced for styles)
  const nonce = crypto.randomUUID()
  res.headers.set('X-CSP-Nonce', nonce)

  // Security headers
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  res.headers.set('Strict-Transport-Security', 'max-age=604800; includeSubDomains')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('Origin-Agent-Cluster', '?1')

  const isProd = process.env.NODE_ENV === 'production'

  // One CSP only (no style-src-elem/attr; allow inline styles)
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'self' https://challenges.cloudflare.com",
    // Scripts: keep nonce + allow inline for Next boot/Turnstile shims
    `script-src 'self' 'nonce-${nonce}' ${isProd ? '' : "'unsafe-eval'"} 'unsafe-inline' https://challenges.cloudflare.com`,
    // Styles: allow inline + external (fixes your violation)
    "style-src 'self' 'unsafe-inline' https:",
    // Images/Fonts/Connect
    "img-src 'self' data: blob: https:",
    "font-src 'self' https: data:",
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    // Optional
    "media-src 'self' https: blob:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')

  res.headers.set('Content-Security-Policy', csp)

  // Host allowlist (add your custom domain here when you attach one)
  const host = (req.headers.get('host') || '').toLowerCase()
  const allowedHosts = ['localhost:3000', 'niesty.com', 'niesty.vercel.app']
  if (!allowedHosts.includes(host)) {
    return new NextResponse('Forbidden host', { status: 403 })
  }

  // Same-origin protection for mutating methods
  const method = req.method.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin') || ''
    const allowedOrigins = ['http://localhost:3000', 'niesty.com', 'https://niesty.vercel.app']
    if (!allowedOrigins.includes(origin)) {
      return new NextResponse('Bad origin', { status: 403 })
    }
  }

  // Auth guard for protected areas
  const needsAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  if (!needsAuth) return res

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
    // IMPORTANT: keep the headers we already set
    const redirectRes = NextResponse.redirect(url)
    res.headers.forEach((value, key) => redirectRes.headers.set(key, value))
    return redirectRes
  }

  // Optional: guard /admin (only if you actually store role='admin')
  if (pathname.startsWith('/admin')) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (prof?.role !== 'admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      const redirectRes = NextResponse.redirect(url)
      res.headers.forEach((value, key) => redirectRes.headers.set(key, value))
      return redirectRes
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
}