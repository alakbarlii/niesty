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

    const parsed = await requireJson(req, MessageSchema, { maxKB: 64 })
    if (parsed instanceof Response) {
      void secLog('/api/messages', 'json_gate_fail', g.user.id)
      return parsed
    }
    const body = parsed.data

    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for') ??
      undefined
    const v = await verifyTurnstile(body.turnstileToken ?? null, ip)
    if (!v.ok) {
      void secLog('/api/messages', `turnstile_${v.reason ?? 'fail'}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Defense-in-depth: user must be a participant of the deal
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