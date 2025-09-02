// lib/secops.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type Severity = 'info' | 'warning' | 'high' | 'critical';

// JSON-safe type (no "any")
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface LogArgs {
  userId?: string | null;
  route: string;
  reason: string;
  ip?: string | null;
  severity?: Severity;
  meta?: Json; // arbitrary JSON payload
}

/**
 * Logs a security event via the SECDEF RPC installed in the DB.
 * - Works with anon or authenticated Supabase client
 * - Never throws (safe for auth flows)
 */
export async function secopsLogViaRpc(
  client: SupabaseClient,
  args: LogArgs
): Promise<void> {
  const {
    userId = null,
    route,
    reason,
    ip = null,
    severity = 'warning',
    meta = null,
  } = args;

  const { error } = await client.rpc('secops_log_event', {
    p_user_id: userId,
    p_route: route,
    p_reason: reason,
    p_ip: ip,
    p_severity: severity,
    p_meta: meta,
  });

  if (error) {
    // Non-fatal: log in dev, swallow in prod
    if (process.env.NODE_ENV !== 'production') {
      
      console.error('[secopsLogViaRpc]', error.message);
    }
  }
}