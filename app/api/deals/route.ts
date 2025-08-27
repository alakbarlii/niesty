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

    const parsed = await requireJson(req, DealSchema, { maxKB: 64 })
    if (parsed instanceof Response) return parsed
    const body = parsed.data

    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      undefined
    const v = await verifyTurnstile(body.turnstileToken, ip)
    if (!v.ok) {
      void secLog('/api/deals', `turnstile_${v.reason}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // 🔑 map auth uid -> profiles.id
    const { data: meProf, error: meErr } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', g.user.id)
      .maybeSingle()

    if (meErr || !meProf?.id) {
      void secLog('/api/deals', 'no_profile_for_sender', g.user.id)
      const reason = process.env.NODE_ENV === 'production'
        ? 'Profile missing'
        : (meErr?.message || 'Profile missing')
      return jsonNoStore({ error: reason }, { status: 400 })
    }

    // Optional: ensure receiver exists (and roles differ)
    const { data: recProf, error: recErr } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', body.receiver_id)
      .maybeSingle()

    if (recErr || !recProf?.id) {
      return jsonNoStore({ error: 'Receiver not found' }, { status: 400 })
    }
    if (meProf.role && recProf.role && meProf.role === recProf.role) {
      return jsonNoStore({ error: 'Deals can only be sent to the opposite role' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: meProf.id,                // ✅ profiles.id (YOU)
        receiver_id: recProf.id,             // ✅ profiles.id (THEM)
        message: body.message,
        deal_value: body.deal_value ?? null,
        offer_currency: body.offer_currency ?? null,
        offer_pricing_mode: body.offer_pricing_mode ?? 'negotiable',
        deal_stage: 'Waiting for Response',
      })
      .select()
      .single()

    if (error) {
      const reason = process.env.NODE_ENV === 'production'
        ? userSafe(error.message)
        : error.message
      void secLog('/api/deals', 'db_error', g.user.id)
      return jsonNoStore({ error: reason }, { status: 400 })
    }

    return jsonNoStore({ deal: data }, { status: 201 })
  } catch (e) {
    void secLog('/api/deals', 'unhandled_error')
    const msg =
      process.env.NODE_ENV === 'production'
        ? 'Request failed'
        : (e instanceof Error ? e.message : 'Request failed')
    return jsonNoStore({ error: msg }, { status: 500 })
  }
}