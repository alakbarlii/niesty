// lib/http.ts
import { NextResponse } from 'next/server'

type NextJson = typeof NextResponse.json
type JsonInit = Parameters<NextJson>[1]

export function jsonNoStore<T>(body: T, init?: JsonInit) {
  const res = NextResponse.json<T>(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
