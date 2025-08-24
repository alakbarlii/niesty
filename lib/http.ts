// lib/http.ts
import { NextResponse, NextRequest } from 'next/server'
import type { ZodSchema } from 'zod'

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** Parse/limit/validate JSON. Returns {data} or a NextResponse. */
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

  const parsed = schema.safeParse(parsedBody)
  if (!parsed.success) {
    // In development, show which fields failed so we never guess again
    if (process.env.NODE_ENV !== 'production') {
      return jsonNoStore(
        {
          error: 'Invalid payload',
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        },
        { status: 400 }
      )
    }
    return jsonNoStore({ error: 'Invalid payload' }, { status: 400 })
  }

  return { data: parsed.data }
}