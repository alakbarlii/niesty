// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Scope: this middleware only runs on /dashboard/* and /admin/* (see config below)
  // Do NOT protect API/static here.

  // Only enforce auth for actual HTML navigations (not RSC/data/assets)
  const accept = req.headers.get('accept') || ''
  const isHTML = accept.includes('text/html')
  if (!isHTML) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  // Supabase SSR client (reads/writes auth cookies)
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
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Gate: must be logged in for /dashboard/* and /admin/*
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Additional admin gate
  if (pathname.startsWith('/admin')) {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error || !data?.is_admin) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return res
}

// Only run on HTML page routes we actually want to protect.
// This avoids touching images, CSS/JS, Next internals, and APIs entirely.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
