// app/dashboard/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies as getCookies } from 'next/headers';

export default async function DashboardPage() {
  const cookiesStore = await getCookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookiesStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ✅ Fallback if user is not logged in
  if (!session) {
    return (
      <div className="text-white text-center mt-20">
        <h1 className="text-2xl">Not logged in</h1>
        <a href="/login" className="underline text-blue-400">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="text-white text-center mt-20">
      <h1 className="text-3xl font-bold">Welcome to Your Dashboard</h1>
      <p className="mt-4 text-white/70">
        Logged in as <strong>{session.user.email}</strong>
      </p>
    </div>
  );
}
