
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}


if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}
