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

    // 4) Resolve sender/receiver as *profiles.id*
    const supabase = await supabaseServer()

    // sender = current viewer's profiles.id (NOT auth uid)
    const { data: senderProf, error: senderErr } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', g.user.id)
      .maybeSingle()

    if (senderErr || !senderProf?.id) {
      void secLog('/api/deals', 'missing_sender_profile', g.user.id)
      return jsonNoStore(
        { error: 'Missing your profile record. Open your profile page, save it once, then try again.' },
        { status: 400 }
      )
    }

    // receiver must also be a valid profiles.id
    const receiverId: string | undefined = body.receiver_id
    if (!receiverId) {
      return jsonNoStore({ error: 'receiver_id is required' }, { status: 400 })
    }

    const { data: receiverProf, error: recvErr } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', receiverId)
      .maybeSingle()

    if (recvErr || !receiverProf?.id) {
      return jsonNoStore({ error: 'Receiver not found' }, { status: 400 })
    }

    if (!senderProf.role || !receiverProf.role || senderProf.role === receiverProf.role) {
      return jsonNoStore({ error: 'Deals can only be sent to the opposite role' }, { status: 400 })
    }

    // 5) Insert (columns must match your table exactly)
    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: senderProf.id,              // <-- profiles.id (fixed)
        receiver_id: receiverProf.id,          // <-- profiles.id
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