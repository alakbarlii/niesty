import type { NextRequest } from 'next/server'
import { jsonNoStore, requireJson } from '@/lib/http'
import { userSafe } from '@/lib/errors'
import { requireUser } from '@/lib/guards'
import { supabaseServer } from '@/lib/supabaseServer'
import { DealSchema } from '@/lib/validators'
import { verifyTurnstile } from '@/lib/turnstile'
import { secLog } from '@/lib/secLog'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Must be authenticated
    const g = await requireUser()
    if (!g.user) {
      void secLog('/api/deals', 'unauthorized')
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce JSON, size limit, and schema
    const parsed = await requireJson(req, DealSchema, { maxKB: 64 })
    if (parsed instanceof Response) return parsed
    const body = parsed.data

    // Turnstile (supports your dev bypass if configured)
    const token = body.turnstileToken ?? null
    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for') ??
      undefined

    const turnstile = await verifyTurnstile(token, ip)
    if (!turnstile.ok) {
      void secLog('/api/deals', `turnstile_fail:${turnstile.reason ?? 'unknown'}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    // Insert using your real columns
    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: g.user.id,
        receiver_id: body.recipient_id,
        message: body.message,
        offer_amount: body.offer_amount,
        status: 'waiting_for_response',
      })
      .select()
      .single()

    if (error) {
      void secLog('/api/deals', `db_error:${error.code ?? 'unknown'}`, g.user.id)
      return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
    }

    return jsonNoStore({ deal: data }, { status: 201 })
  } catch {
    void secLog('/api/deals', 'unhandled_error')
    return jsonNoStore({ error: 'Request failed' }, { status: 500 })
  }
}