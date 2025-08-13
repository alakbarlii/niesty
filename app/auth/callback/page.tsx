// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace('/login');
        return;
      }

      const user = session.user;
      const userId = user.id;
      const email = user.email ?? null;

      // Ensure profile exists for current user (RLS self insert/update)
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('profiles').upsert({
          user_id: userId,
          email,
          full_name: user.user_metadata?.name ?? null,
          role: null, // user will set it later
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      // Go to dashboard (admin pages link from there)
      router.replace('/dashboard');
    });

    return () => { subscription.unsubscribe(); };
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in…</div>;
}