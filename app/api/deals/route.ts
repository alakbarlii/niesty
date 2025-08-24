// app/api/deals/route.ts
import type { NextRequest } from 'next/server'
import { jsonNoStore } from '@/lib/http'
import { userSafe } from '@/lib/errors'
import { requireUser } from '@/lib/guards'
import { supabaseServer } from '@/lib/supabaseServer'
import { DealStartSchema } from '@/lib/validators'
import { verifyTurnstile } from '@/lib/turnstile'
import { secLog } from '@/lib/secLog'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // must be signed in
    const g = await requireUser()
    if (!g.user) {
      void secLog('/api/deals', 'unauthorized')
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }

    // parse body
    const body = await req.json().catch(() => null)
    const token: string | null = (body?.turnstileToken ?? null) as string | null
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      ''

    // bot check (dev bypass handled inside verifyTurnstile)
    const ver = await verifyTurnstile(token ?? '', ip || undefined)
    if (!ver.ok) {
      void secLog('/api/deals', `turnstile_fail:${ver.reason ?? 'unknown'}`, g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    // validate payload against *your* shape
    const parsed = DealStartSchema.safeParse(body)
    if (!parsed.success) {
      void secLog('/api/deals', 'zod_fail', g.user.id)
      return jsonNoStore({ error: 'Invalid payload' }, { status: 400 })
    }

    const { receiver_id, message, amount } = parsed.data

    // insert (column names exactly as in your table)
    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: g.user.id,
        receiver_id,
        message,
        deal_value: amount ?? null,
        deal_stage: 'Waiting for Response',
        status: null,
      })
      .select('*')
      .single()

    if (error) {
      void secLog('/api/deals', `db_error:${error.code || ''}`, g.user.id)
      return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
    }

    return jsonNoStore({ deal: data }, { status: 201 })
  } catch {
    void secLog('/api/deals', 'unhandled_error')
    return jsonNoStore({ error: 'Request failed' }, { status: 500 })
  }
}