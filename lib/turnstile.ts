// lib/turnstile.ts
import { env } from './env';

type VerifyResp = {
  success: boolean;
  action?: string;
  cdata?: string;
  'error-codes'?: string[];
};

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Read a "truthy" feature flag from multiple possible env names.
 * Accepts "1", "true", "TRUE".
 */
function isBypassEnabled(): boolean {
  const candidates = [
    process.env.DEV_TURNSTILE_BYPASS,
    process.env.NEXT_PUBLIC_FEATURE_TURNSTILE, // you mentioned this existed before
    process.env['dev.turnstyle.bypass'],       // common typo
    process.env['dev.turnstile.bypass'],       // dotted variant
  ];

  for (const v of candidates) {
    if (!v) continue;
    const s = String(v).trim().toLowerCase();
    if (s === '1' || s === 'true') return true;
  }
  return false;
}

/** Non-production check that also treats Vercel preview as non-prod. */
function isNonProdLike(): boolean {
  const ve = process.env.VERCEL_ENV; // 'development' | 'preview' | 'production' | undefined
  if (ve === 'development' || ve === 'preview') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

/**
 * Cloudflare Turnstile verification with optional action/cdata checks.
 * Dev/preview bypass: if (isBypassEnabled || isNonProdLike || no TURNSTILE_SECRET_KEY) AND token === "dev-ok" -> OK.
 * Otherwise, verify with Cloudflare.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string,
  expectedAction?: string,
  expectedCdataPrefix?: string
): Promise<VerifyResult> {
  const allowBypass =
    isBypassEnabled() || isNonProdLike() || !env.TURNSTILE_SECRET_KEY;

  // Dev/preview bypass path (keeps your previous behavior, just more robust)
  if (allowBypass && token === 'dev-ok') {
    return { ok: true };
  }

  // From here on, we require a real token (in strict prod)
  if (!token) return { ok: false, reason: 'missing_token' };

  try {
    const form = new URLSearchParams();
    form.set('secret', env.TURNSTILE_SECRET_KEY);
    form.set('response', token);
    if (remoteip) form.set('remoteip', remoteip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });

    if (!res.ok) return { ok: false, reason: `verify_http_${res.status}` };

    const data = (await res.json().catch(() => null)) as VerifyResp | null;
    if (!data) return { ok: false, reason: 'verify_parse_failed' };

    if (!data.success) {
      const reason = data['error-codes']?.join(',') ?? 'verify_failed';
      return { ok: false, reason };
    }

    if (expectedAction && data.action !== expectedAction) {
      return { ok: false, reason: 'wrong_action' };
    }
    if (expectedCdataPrefix && data.cdata && !data.cdata.startsWith(expectedCdataPrefix)) {
      return { ok: false, reason: 'wrong_cdata' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'verify_exception' };
  }
}
