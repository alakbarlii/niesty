import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const supabaseServerAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);
