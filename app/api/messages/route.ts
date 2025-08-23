import { NextRequest } from 'next/server'
import { jsonNoStore } from '@/lib/http'
import { userSafe } from '@/lib/errors'
import { requireUser } from '@/lib/guards'
import { supabaseServer } from '@/lib/supabaseServer'
import { MessageSchema } from '@/lib/validators'
import { verifyTurnstile } from '@/lib/turnstile'

export async function POST(req: NextRequest) {
  const g = await requireUser()
  if (!g.user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const token = body?.turnstileToken ?? null
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || ''
  const ok = await verifyTurnstile(token, ip)
  if (!ok) return jsonNoStore({ error: 'Bot' }, { status: 400 })

  const parsed = MessageSchema.safeParse(body)
  if (!parsed.success) return jsonNoStore({ error: 'Invalid payload' }, { status: 400 })

  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('deal_messages')
    .insert({
      deal_id: parsed.data.deal_id,
      sender_id: g.user.id,
      content: parsed.data.content,
    })
    .select()
    .single()

  if (error) return jsonNoStore({ error: userSafe(error.message) }, { status: 400 })
  return jsonNoStore({ message: data }, { status: 201 })
}
