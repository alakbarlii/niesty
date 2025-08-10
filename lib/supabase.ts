import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

let _client: SupabaseClient | null = null;

// Derive the exact auth options type without using `any`
type AuthOptions = NonNullable<SupabaseClientOptions<unknown>['auth']>;

function makeClient(): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';
  const isDev = process.env.NODE_ENV !== 'production';

  const auth: AuthOptions = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  };

  // Isolate tabs in dev; persist across tabs in prod
  if (isBrowser) {
    auth.storage = isDev ? window.sessionStorage : window.localStorage;
    auth.storageKey = isDev ? 'supabase.dev.session' : 'supabase.niesty.session';
  }

  return createClient(supabaseUrl, supabaseAnonKey, { auth });
}

/** Singleton client */
export const supabase: SupabaseClient = (() => {
  if (_client) return _client;
  _client = makeClient();
  return _client;
})();

/** Back-compat: always return the singleton with the same options */
export function createBrowserClient(): SupabaseClient {
  return supabase;
}
