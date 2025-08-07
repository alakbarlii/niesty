import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

//  Create a client immediately
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// (optional) Keep the factory if needed elsewhere
export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}
