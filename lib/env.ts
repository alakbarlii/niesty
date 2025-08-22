export const env = {
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY!,
    TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    SUPABASE_REDIRECT_URL: process.env.SUPABASE_REDIRECT_URL!,
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  };
  