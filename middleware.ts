// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/** CSP nonce that works on the Edge without node:crypto */
function genNonce(): string {
  if (globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(16)
    globalThis.crypto.getRandomValues(arr)
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // ---------- Security headers ----------
  const nonce = genNonce()
  res.headers.set('x-csp-nonce', nonce)

  // Keep these aligned with what Cloudflare is setting globally
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('Origin-Agent-Cluster', '?1')
  // Do NOT set HSTS here (Cloudflare/transform rule already does it)

  const isProd = process.env.NODE_ENV === 'production'

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "frame-src 'self' https://challenges.cloudflare.com",
    // keep nonce; retain 'unsafe-eval' only for dev; leave 'unsafe-inline' to avoid breaking if any inline remains
    `script-src 'self' 'nonce-${nonce}' ${isProd ? '' : "'unsafe-eval'"} 'unsafe-inline' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https: data:",
    // supabase + websockets + CF challenge
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    "media-src 'self' https: blob:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)

  // ---------- Host allowlist ----------
  const host = (req.headers.get('host') || '').toLowerCase()
  const allowedHosts = [
    'localhost:3000',
    'niesty.com',
    'www.niesty.com',
    'niesty.vercel.app',
  ]
  if (!allowedHosts.includes(host)) {
    return new NextResponse('Forbidden host', { status: 403 })
  }

  // ---------- Same-origin protection for mutating methods ----------
  const method = req.method.toUpperCase()
  const isAuthPath =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth/v1') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/bootstrap-profile') ||
    pathname.startsWith('/api/secops/log')

  if (!isAuthPath && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin')
    if (origin) {
      try {
        if (new URL(origin).host.toLowerCase() !== host) {
          return new NextResponse('Bad origin', { status: 403 })
        }
      } catch {
        // ignore malformed origin
      }
    }
  }

  // ---------- Auth guard for protected areas ----------
  const needsAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  if (!needsAuth) return res

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
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
    // best-effort log (non-blocking)
    try {
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || ''
      fetch(`${req.nextUrl.origin}/api/secops/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secops-key': process.env.SECOPS_INTERNAL_KEY || '',
        },
        body: JSON.stringify({
          userId: null,
          route: pathname,
          reason: 'unauth_access_protected',
          ip,
          severity: 'high',
          meta: { ua: req.headers.get('user-agent') || '' },
        }),
      }).catch(() => {})
    } catch {}

    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    const redirectRes = NextResponse.redirect(url)
    // preserve headers we set above
    res.headers.forEach((value, key) => redirectRes.headers.set(key, value))
    return redirectRes
  }

  // Optional admin-only check
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
    // run on everything except static assets & common files
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
}