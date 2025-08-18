
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

        if (hasCode) {
          // OAuth/PKCE style callback
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else {
          // Magic-link style callback (tokens are in the URL hash)
          const { access_token, refresh_token } = parseHashTokens(window.location.hash);
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        }

        // Clean query/hash from the URL bar
        window.history.replaceState({}, document.title, url.pathname);

        // Verify session exists
        const {
          data: { session },
          error: getSessionErr,
        } = await supabase.auth.getSession();
        if (getSessionErr || !session) throw getSessionErr || new Error('No session after callback');

        const user = session.user;
        const email = (user.email || '').toLowerCase();

        // ---- Waitlist gate (server-protected) ----
        let roleFromWaitlist: string | null = null;
        const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const body: WaitlistCheck = await res.json();
        if (!body.ok) {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }
        roleFromWaitlist = body.role ?? null;

        // ---- Ensure profile exists (RLS: user can upsert own row) ----
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

        // ---- In! ----
        router.replace('/dashboard');
      } catch (err) {
        console.error('[Auth callback error]', err);
        // Hard reset to login on any failure
        router.replace('/login');
      }
    };

    run();
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in…</div>;
}