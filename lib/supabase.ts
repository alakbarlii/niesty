import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

let _client: SupabaseClient | null = null;

// Type-safe auth options (no `any`)
type AuthOptions = NonNullable<SupabaseClientOptions<unknown>['auth']>;

/**
 * Stable per-tab id:
 * - Stored in sessionStorage (tab-scoped)
 * - Used to create a unique localStorage key per tab
 *   => different tabs don't overwrite each other
 *   => sessions survive refresh in the same tab
 */
function getTabId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const KEY = 'niesty_tab_id';
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

function makeClient(): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';

  const auth: AuthOptions = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  };

  if (isBrowser) {
    // Use localStorage for persistence, but isolate by tab via unique storageKey
    const tabId = getTabId();
    auth.storage = window.localStorage;
    auth.storageKey = `supabase.session.${tabId}`;
  }

  return createClient(supabaseUrl, supabaseAnonKey, { auth });
}

/** Singleton client */
export const supabase: SupabaseClient = (() => {
  if (_client) return _client;
  _client = makeClient();
  return _client;
})();

/** Back-compat: always return the singleton */
export function createBrowserClient(): SupabaseClient {
  return supabase;
}
