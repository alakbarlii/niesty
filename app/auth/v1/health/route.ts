// app/auth/v1/health/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'      // always run at the edge, no static cache
export const runtime = 'edge'               // (ok on node too—remove if you prefer)

export async function GET() {
  // ultra small JSON; include a monotonic timestamp to avoid caches
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  )
}

export const HEAD = GET   // respond 200 to HEAD as well