// lib/http.ts
import { NextResponse, NextRequest } from 'next/server'
import type { ZodSchema } from 'zod'

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/**
 * Enforce JSON Content-Type, hard size cap (even without Content-Length),
 * then validate with the provided zod schema.
 * If you want "no extra keys", make your schema .strict() at definition time.
 */
export async function requireJson<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  opts?: { maxKB?: number }
): Promise<{ data: T } | NextResponse> {
  const maxKB = opts?.maxKB ?? 64
  const ct = (req.headers.get('content-type') || '').toLowerCase()
  if (!ct.includes('application/json')) {
    return jsonNoStore({ error: 'Unsupported Media Type' }, { status: 415 })
  }

  let raw = ''
  try {
    raw = await req.text()
  } catch {
    return jsonNoStore({ error: 'Invalid JSON' }, { status: 400 })
  }

  const bytes = new TextEncoder().encode(raw).length
  if (bytes > maxKB * 1024) {
    return jsonNoStore({ error: 'Payload too large' }, { status: 413 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(raw)
  } catch {
    return jsonNoStore({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(parsedBody) // <-- no .strict() here
  if (!parsed.success) {
    return jsonNoStore({ error: 'Invalid payload' }, { status: 400 })
  }

  return { data: parsed.data }
}
