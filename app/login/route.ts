// app/login/route.ts
import { NextResponse } from 'next/server'

export const HEAD = () =>
  new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })