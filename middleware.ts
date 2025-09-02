// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

/** Safe nonce for CSP (works in Edge + TS, no Node crypto import needed) */
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

  // Response container for headers/cookies
  const res = NextResponse.next()

  // ---------- Security headers ----------
  const nonce = genNonce()
  res.headers.set('X-CSP-Nonce', nonce)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  // keep short HSTS until fully confident; bump later to 6-12 months + preload
  res.headers.set('Strict-Transport-Security', 'max-age=604800; includeSubDomains')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('Origin-Agent-Cluster', '?1')

  const isProd = process.env.NODE_ENV === 'production'

  // Single CSP (allow Turnstile + Supabase endpoints)
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'self' https://challenges.cloudflare.com",
    `script-src 'self' 'nonce-${nonce}' ${isProd ? '' : "'unsafe-eval'"} 'unsafe-inline' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https: data:",
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    "media-src 'self' https: blob:",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)

  // ---------- Host allowlist ----------
  const host = (req.headers.get('host') || '').toLowerCase()
  const allowedHosts = [
    'localhost:3000',
    'niesty.com',
    'www.niesty.com',
    'niesty.vercel.app', // allow preview
  ]
  if (!allowedHosts.includes(host)) {
    return new NextResponse('Forbidden host', { status: 403 })
  }

  // ---------- Same-origin protection for mutating methods ----------
  // Exempt auth/session/bootstrap/internal logger to avoid breaking flows
  const isAuthPath =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth/v1') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/bootstrap-profile') ||
    pathname.startsWith('/api/secops/log')

  const method = req.method.toUpperCase()
  if (!isAuthPath && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin') || ''
    if (origin) {
      // compare hosts (supports both root + www)
      let originHost = ''
      try { originHost = new URL(origin).host.toLowerCase() } catch {}
      if (originHost !== host) {
        return new NextResponse('Bad origin', { status: 403 })
      }
    }
    // if no Origin header (server-to-server), allow
  }

  // ---------- Auth guard for protected areas ----------
  const needsAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin')

  if (!needsAuth) return res

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { res.cookies.set(name, value, options) },
        remove(name: string, options: CookieOptions) { res.cookies.set(name, '', { ...options, maxAge: -1 }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    // 🔐 log unauth access attempt (non-blocking)
    try {
      const ip =
        req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-forwarded-for') ||
        '' // Edge doesn't expose req.ip

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
    // Preserve security headers on redirect
    res.headers.forEach((value, key) => redirectRes.headers.set(key, value))
    return redirectRes
  }

  // Optional: lock down /admin to role='admin'
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
    // Run on everything except static assets & images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
}