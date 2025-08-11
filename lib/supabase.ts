import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/** Minimal in-memory storage fallback for environments where localStorage is unavailable. */
const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
})();

/** Safely test localStorage availability (handles Safari private mode, iframes, etc.). */
function getSafeLocalStorage():
  | Storage
  | {
      getItem: (k: string) => string | null;
      setItem: (k: string, v: string) => void;
      removeItem: (k: string) => void;
    } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return memoryStorage;
    const testKey = '__niesty_ls_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

/**
 * Stable per-tab id:
 * - Stored in sessionStorage (tab-scoped)
 * - Used to create a unique storageKey per tab so different tabs don't overwrite each other
 */
function getTabId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const KEY = 'niesty_tab_id';
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // If sessionStorage is blocked, fall back to a random id per load (still isolates tabs reasonably)
    return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

let _client: SupabaseClient | null = null;

// Type-safe auth options
type AuthOptions = NonNullable<SupabaseClientOptions<unknown>['auth']>;

function makeClient(): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';

  const auth: AuthOptions = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  };

  if (isBrowser) {
    const tabId = getTabId();
    auth.storage = getSafeLocalStorage();
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
