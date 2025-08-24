import type { NextRequest } from 'next/server'
import { jsonNoStore } from '@/lib/http'
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

    const body: unknown = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      void secLog('/api/deals', 'bad_json', g.user.id)
      return jsonNoStore({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Normalize token to string for TS & verifier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = typeof (body as any).turnstileToken === 'string' ? (body as any).turnstileToken : ''
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      ''

    const ok = await verifyTurnstile(token, ip)
    if (!ok) {
      void secLog('/api/deals', 'turnstile_fail', g.user.id)
      return jsonNoStore({ error: 'Bot' }, { status: 400 })
    }

    const parsed = DealSchema.safeParse(body)
    if (!parsed.success) {
      void secLog('/api/deals', 'zod_fail', g.user.id)
      return jsonNoStore({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('deals')
      .insert({
        creator_id: g.user.id,
        sponsor_id: parsed.data.recipient_id,
        message: parsed.data.message,
        offer_amount: parsed.data.offer_amount,
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
