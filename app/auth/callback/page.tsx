// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type WaitlistCheck = { ok: boolean; role?: string | null; fullName?: string | null };

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace('/login');
        return;
      }

      const user = session.user;
      const email = user.email?.toLowerCase() ?? '';

      // Gate by waitlist (server-only route)
      let roleFromWaitlist: string | null = null;
      try {
        const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const body: WaitlistCheck = await res.json();
        if (!body.ok) {
          // Not allowed -> log out and bounce
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }
        roleFromWaitlist = body.role ?? null;
      } catch {
        // If we can't verify, do not proceed
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      // Ensure a profile exists for this user (RLS: user can upsert own row)
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('profiles').upsert(
          {
            user_id: user.id,
            email,
            full_name: user.user_metadata?.name ?? null,
            role: roleFromWaitlist, // seed role from waitlist
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }

      router.replace('/dashboard');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in…</div>;
}