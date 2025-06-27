'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login'); // Redirect to login if not authenticated
      } else {
        setSession(session);
      }
    };

    getSession();
  }, [router]);

  if (!session) {
    return (
      <div className="text-white text-center mt-20">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="text-white text-center mt-20">
      <h1 className="text-3xl font-bold">Welcome to Your Dashboard</h1>
      <p className="mt-4 text-white/70">
        Your session is active. Enjoy the power of Niesty 🚀🔥
      </p>
    </div>
  );
}
