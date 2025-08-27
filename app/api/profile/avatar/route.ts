import { NextRequest } from 'next/server'
import { jsonNoStore } from '@/lib/http'
import { userSafe } from '@/lib/errors'
import { requireUser } from '@/lib/guards'
import { supabaseServer } from '@/lib/supabaseServer'
import { validateImageBuffer, MAX_UPLOAD_BYTES } from '@/lib/upload'

export const runtime = 'nodejs' // needed for Buffer & file-type

export async function POST(req: NextRequest) {
  const g = await requireUser()
  if (!g.user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })

  // Expect multipart/form-data with a single "file" field
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonNoStore({ error: 'Bad form data' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return jsonNoStore({ error: 'Missing file' }, { status: 400 })
  }

  // Guard max payload early (client might lie about size)
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonNoStore({ error: 'File too large' }, { status: 400 })
  }

  // Read bytes + sniff MIME
  const ab = await file.arrayBuffer()
  const buf = Buffer.from(ab)
  const validated = await validateImageBuffer(buf)
  if (!validated.ok) {
    return jsonNoStore({ error: validated.reason }, { status: 400 })
  }

  // Enforce path convention: profiles/<USER_ID>/avatar.<ext>
  const ext = validated.ext
  const userId = g.user.id
  const path = `${userId}/avatar.${ext}`

  const supabase = await supabaseServer()

  // Upload (private bucket), overwrite existing
  const { error: upErr } = await supabase
    .storage
    .from('profiles')
    .upload(path, buf, {
      upsert: true,
      contentType: validated.mime,
    })

  if (upErr) {
    return jsonNoStore({ error: userSafe(upErr.message) }, { status: 400 })
  }

  // Persist path on profile (if you keep avatar_path there)
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('user_id', userId)

  if (dbErr) {
    return jsonNoStore({ error: userSafe(dbErr.message) }, { status: 400 })
  }

  return jsonNoStore({ ok: true, path }, { status: 201 })
}
