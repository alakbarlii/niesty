import { NextResponse } from 'next/server'

// Run dynamically and never cache
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}