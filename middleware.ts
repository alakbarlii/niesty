// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always create a response we can attach headers to
  const res = NextResponse.next()

  // Per-request nonce
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

  // DEV: relaxed to avoid friction
  const cspDev = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'self' https://challenges.cloudflare.com",
    // dev scripts
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}' https: https://challenges.cloudflare.com`,
    // split style controls:
    // - allow external + self for <style> tags
    "style-src 'self' https:",
    // - allow inline style attributes freely in dev
    "style-src-attr 'unsafe-inline'",
    // - allow <style> elements; nonce not required in dev
    "style-src-elem 'self' https:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    "font-src 'self' https: data:",
    "media-src 'self' https: blob:",
  ].join('; ')

  // PROD: strict scripts, pragmatic styles WITHOUT mixing nonce + unsafe-inline in the same directive
  const cspProd = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'self' https://challenges.cloudflare.com",
    // scripts locked with nonce (no unsafe-inline)
    `script-src 'self' 'nonce-${nonce}' https: https://challenges.cloudflare.com`,
    // styles split:
    // - external + self allowed for <style> elements AND require nonce for any inline <style>
    `style-src 'self' https:`,
    `style-src-elem 'self' 'nonce-${nonce}' https:`,
    // - allow inline style="" attributes (this is the key to stop the error)
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com",
    "font-src 'self' https: data:",
    "media-src 'self' https: blob:",
  ].join('; ')

  res.headers.set('Content-Security-Policy', isProd ? cspProd : cspDev)

  // Host allowlist
  const host = (req.headers.get('host') || '').toLowerCase()
  const allowedHosts = ['localhost:3000', 'niesty.vercel.app']
  if (!allowedHosts.includes(host)) {
    return new NextResponse('Forbidden host', { status: 403 })
  }

  // Same-origin protection for mutating methods
  const method = req.method.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin') || ''
    const allowedOrigins = ['http://localhost:3000', 'https://niesty.vercel.app']
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
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
}