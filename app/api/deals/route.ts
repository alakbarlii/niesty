// app/api/deals/route.ts
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
    const g = await requireUser()
    if (!g.user) {
      void secLog('/api/deals', 'unauthorized')
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ parse + validate body (and show field issues in dev)
    const parsed = await requireJson(req, DealSchema)
    if (parsed instanceof Response) return parsed
    const body = parsed.data

    // ✅ Turnstile (with dev bypass already handled inside verifyTurnstile)
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      undefined
    const vt = await verifyTurnstile(body.turnstileToken ?? null, ip, 'deal_create')
    if (!vt.ok) {
      void secLog('/api/deals', `turnstile_${vt.reason}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: g.user.id,
        receiver_id: body.receiver_id,
        message: body.message,
        // optional pricing/context if provided
        deal_value: body.deal_value ?? null,
        offer_currency: body.offer_currency ?? null,
        offer_pricing_mode: body.offer_pricing_mode ?? null,
        deal_stage: 'Waiting for Response',
        status: 'waiting_for_response',
      })
      .select()
      .single()

    if (error) {
      void secLog('/api/deals', 'db_error', g.user.id)
      return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
    }

    return jsonNoStore({ deal: data }, { status: 201 })
  } catch {
    void secLog('/api/deals', 'unhandled_error')
    return jsonNoStore({ error: 'Request failed' }, { status: 500 })
  }
}