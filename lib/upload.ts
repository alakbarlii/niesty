import { fileTypeFromBuffer } from 'file-type'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB
export const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function validateImageBuffer(buf: Buffer) {
  if (buf.length > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'File too large' } as const
  }
  const ft = await fileTypeFromBuffer(buf)
  if (!ft || !ALLOWED_MIME.has(ft.mime)) {
    return { ok: false, reason: 'Unsupported file' } as const
  }
  return { ok: true, ext: ft.ext, mime: ft.mime } as const
}
