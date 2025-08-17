'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type WaitlistCheck = { ok: boolean; role?: string | null; fullName?: string | null };

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // ✅ This is the missing piece: exchange the URL code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        console.error('Session exchange failed', error);
        router.replace('/login');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const user = session.user;
      const email = user.email?.toLowerCase() ?? '';

      // ✅ Waitlist check
      let roleFromWaitlist: string | null = null;
      try {
        const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const body: WaitlistCheck = await res.json();
        if (!body.ok) {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }
        roleFromWaitlist = body.role ?? null;
      } catch {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      // ✅ Profile bootstrap
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
            role: roleFromWaitlist,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }

      router.replace('/dashboard');
    };

    handleAuth();
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in…</div>;
}
