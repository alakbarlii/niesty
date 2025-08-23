// lib/secLog.ts
import { supabaseServer } from '@/lib/supabaseServer'

/**
 * Record a security event for visibility (unauthorized, zod_fail, turnstile_fail, etc.)
 */
export async function secLog(route: string, reason: string, user_id?: string) {
  try {
    const sb = await supabaseServer()
    await sb.from('security_events').insert({
      route,
      reason,
      user_id: user_id ?? null,
    })
  } catch {
    // Intentionally swallow: logging must never break the request flow
  }
}
