// lib/supabase.ts
import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
})();

function getSafeLocalStorage() {
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
    return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

let _client: SupabaseClient | null = null;
type AuthOptions = NonNullable<SupabaseClientOptions<unknown>['auth']>;

function makeClient(): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';
  const auth: AuthOptions = { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true };

  if (isBrowser) {
    const tabId = getTabId();
    auth.storage = getSafeLocalStorage();
    auth.storageKey = `supabase.session.${tabId}`;
  }

  return createClient(supabaseUrl, supabaseAnonKey, { auth });
}

export const supabase: SupabaseClient = (() => {
  if (_client) return _client;
  _client = makeClient();
  return _client;
})();

export function createBrowserClient(): SupabaseClient {
  return supabase;
}