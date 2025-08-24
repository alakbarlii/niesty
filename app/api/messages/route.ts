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

    // Enforce JSON, size limit, and schema
    const parsed = await requireJson(req, MessageSchema, { maxKB: 64 })
    if (parsed instanceof Response) return parsed
    const body = parsed.data

    // Turnstile
    const token = body.turnstileToken ?? null
    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for') ??
      undefined

    const turnstile = await verifyTurnstile(token, ip)
    if (!turnstile.ok) {
      void secLog('/api/messages', `turnstile_fail:${turnstile.reason ?? 'unknown'}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Defense-in-depth: ensure current user is a participant on the deal
    const { data: dealRow, error: dealErr } = await supabase
      .from('deals')
      .select('id, sender_id, receiver_id')
      .eq('id', body.deal_id)
      .single()

    if (dealErr || !dealRow || (dealRow.sender_id !== g.user.id && dealRow.receiver_id !== g.user.id)) {
      void secLog('/api/messages', 'not_participant', g.user.id)
      return jsonNoStore({ error: 'Forbidden' }, { status: 403 })
    }

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
      void secLog('/api/messages', `db_error:${error.code ?? 'unknown'}`, g.user.id)
      return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
    }

    return jsonNoStore({ message: data }, { status: 201 })
  } catch {
    void secLog('/api/messages', 'unhandled_error')
    return jsonNoStore({ error: 'Request failed' }, { status: 500 })
  }
}