'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type WaitlistCheck = { ok: boolean; role?: string | null; fullName?: string | null };

function parseHashTokens(hash: string) {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const access_token = params.get('access_token') || undefined;
  const refresh_token = params.get('refresh_token') || undefined;
  return { access_token, refresh_token };
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasCode = !!url.searchParams.get('code');

        // 1) Establish session
        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else {
          const { access_token, refresh_token } = parseHashTokens(window.location.hash);
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        }

        // Clean URL
        window.history.replaceState({}, document.title, url.pathname);

        // 2) Verify session
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !session) throw sessErr || new Error('No session after callback');

        const user = session.user;
        const email = (user.email || '').toLowerCase();

        // 3) Waitlist gate
        const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const body: WaitlistCheck = await res.json();
        if (!body.ok) {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }
        const roleFromWaitlist = body.role ?? null;

        // 4) Best-effort profile bootstrap (don’t block on RLS)
        try {
          const { data: existing } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!existing) {
            await supabase.from('profiles').insert({
              user_id: user.id,
              email,
              full_name: user.user_metadata?.name ?? null,
              role: roleFromWaitlist,
              created_at: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('[profiles bootstrap skipped]', e);
        }

        router.replace('/dashboard');
      } catch (err) {
        console.error('[Auth callback error]', err);
        router.replace('/login');
      }
    };

    run();
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in…</div>;
}