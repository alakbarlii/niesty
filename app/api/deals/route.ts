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
    // 1) Auth
    const g = await requireUser()
    if (!g.user) {
      void secLog('/api/deals', 'unauthorized')
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2) Parse + size limit + schema
    const parsed = await requireJson(req, DealSchema, { maxKB: 64 })
    if (parsed instanceof Response) return parsed
    const body = parsed.data

    // 3) Turnstile (dev bypass works with token "dev-ok")
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      undefined
    const v = await verifyTurnstile(body.turnstileToken, ip)
    if (!v.ok) {
      void secLog('/api/deals', `turnstile_${v.reason}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    // 4) Insert
    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: g.user.id,                // <— YOU as the sender
        receiver_id: body.receiver_id,       // <— target user UUID
        message: body.message,
        deal_value: body.deal_value ?? null,
        offer_currency: body.offer_currency ?? null,
        offer_pricing_mode: body.offer_pricing_mode ?? 'negotiable',
        deal_stage: 'Waiting for Response',  // <— ensure stage set on insert
      })
      .select()
      .single()

    if (error) {
      // show detailed reason in non-prod to speed debugging
      const reason = process.env.NODE_ENV === 'production'
        ? userSafe(error.message)
        : error.message
      void secLog('/api/deals', 'db_error', g.user.id)
      return jsonNoStore({ error: reason }, { status: 400 })
    }

    return jsonNoStore({ deal: data }, { status: 201 })
  } catch (e) {
    void secLog('/api/deals', 'unhandled_error')
    // Show detail in dev to unblock you
    const msg =
      process.env.NODE_ENV === 'production'
        ? 'Request failed'
        : (e instanceof Error ? e.message : 'Request failed')
    return jsonNoStore({ error: msg }, { status: 500 })
  }
}