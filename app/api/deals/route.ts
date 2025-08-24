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

    const parsed = await requireJson(req, DealSchema, { maxKB: 64 })
    if (parsed instanceof Response) {
      void secLog('/api/deals', 'json_gate_fail', g.user?.id)
      return parsed
    }
    const body = parsed.data

    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for') ??
      undefined

    const v = await verifyTurnstile(body.turnstileToken ?? null, ip, 'submit_deal')
    if (!v.ok) {
      void secLog('/api/deals', `turnstile_${v.reason ?? 'fail'}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    // Normalize fields to your DB:
    // - amount => deal_value
    // - pricing_mode is already 'fixed' | 'negotiable'
    const amount = (typeof body.offer_amount === 'number')
      ? body.offer_amount
      : (body.deal_value as number)

    const supabase = await supabaseServer()
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        sender_id: g.user.id,
        receiver_id: body.receiver_id,
        message: body.message,

        deal_value: amount,
        offer_currency: body.offer_currency,          // already uppercased by schema
        offer_pricing_mode: body.pricing_mode,        // 'fixed' | 'negotiable'

        agreement_terms: body.agreement_terms ?? null,
        // everything else (status/stage/flags/timestamps) via DB defaults
      })
      .select()
      .single()

    if (error) {
      void secLog('/api/deals', `db_error:${error.code ?? 'unknown'}`, g.user.id)
      return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
    }

    return jsonNoStore({ deal }, { status: 201 })
  } catch {
    void secLog('/api/deals', 'unhandled_error')
    return jsonNoStore({ error: 'Request failed' }, { status: 500 })
  }
}