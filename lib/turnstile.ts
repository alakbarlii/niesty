// lib/turnstile.ts
import { env } from './env'

type VerifyResp = {
  success: boolean
  action?: string
  cdata?: string
  'error-codes'?: string[]
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Cloudflare Turnstile verification with optional action/cdata checks.
 * Returns { ok: true } on success, else { ok: false, reason }.
 * Dev bypass (ignored in production): set DEV_TURNSTILE_BYPASS=1 and send token 'dev-ok'.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string,
  expectedAction?: string,
  expectedCdataPrefix?: string
): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: 'missing_token' }

  // Dev bypass for local/preview testing (never in production)
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_TURNSTILE_BYPASS === '1' &&
    token === 'dev-ok'
  ) {
    return { ok: true }
  }

  try {
    const body = new URLSearchParams()
    body.set('secret', env.TURNSTILE_SECRET_KEY)
    body.set('response', token)
    if (remoteip) body.set('remoteip', remoteip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })

    if (!res.ok) {
      return { ok: false, reason: `verify_http_${res.status}` }
    }

    const data = (await res.json().catch(() => null)) as VerifyResp | null
    if (!data) return { ok: false, reason: 'verify_parse_failed' }

    if (!data.success) {
      return { ok: false, reason: data['error-codes']?.join(',') ?? 'verify_failed' }
    }

    if (expectedAction && data.action !== expectedAction) {
      return { ok: false, reason: 'wrong_action' }
    }

    if (expectedCdataPrefix && data.cdata && !data.cdata.startsWith(expectedCdataPrefix)) {
      return { ok: false, reason: 'wrong_cdata' }
    }

    return { ok: true }
  } catch {
    return { ok: false, reason: 'verify_exception' }
  }
}
