import type { NextRequest } from 'next/server'
import { jsonNoStore, requireJson } from '@/lib/http'
import { userSafe } from '@/lib/errors'
import { requireUser } from '@/lib/guards'
import { supabaseServer } from '@/lib/supabaseServer'
import { MessageSchema } from '@/lib/validators'
import { verifyTurnstile } from '@/lib/turnstile'
import { secLog } from '@/lib/secLog'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const g = await requireUser()
    if (!g.user) {
      void secLog('/api/messages', 'unauthorized')
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce JSON content-type, size, and schema
    const parsed = await requireJson(req, MessageSchema, { maxKB: 64 })
    if (parsed instanceof Response) return parsed
    const body = parsed.data

    // Normalize token to a string (TS fix) and pull IP
    const token: string = body.turnstileToken ?? ''
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      ''

    const ok = await verifyTurnstile(token, ip)
    if (!ok) {
      void secLog('/api/messages', 'turnstile_fail', g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('deal_messages')
      .insert({
        deal_id: body.deal_id,
        sender_id: g.user.id,
        content: body.content,
      })
      .select()
      .single()

    if (error) {
      void secLog('/api/messages', 'db_error', g.user.id)
      return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
    }

    return jsonNoStore({ message: data }, { status: 201 })
  } catch {
    void secLog('/api/messages', 'unhandled_error')
    return jsonNoStore({ error: 'Request failed' }, { status: 500 })
  }
}
