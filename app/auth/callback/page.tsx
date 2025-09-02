// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { secopsLogViaRpc } from '@/lib/secops';

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

        // 1) Establish session for both flows
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

        // 2) Verify session & get tokens for cookie bridge
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !session) throw sessErr || new Error('No session after callback');

        // 3) Write HttpOnly cookies on the server so middleware can see auth
        await fetch('/api/auth/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token!,
          }),
        });

        const user = session.user;
        const email = (user.email || '').toLowerCase();

        // 4) Waitlist gate (server-protected)
        const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const body = (await res.json()) as WaitlistCheck;
        if (!body.ok) {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }
        const roleFromWaitlist = body.role ?? null;

        // 5) Server-side profile bootstrap (uses service role on server)
        const bp = await fetch('/api/bootstrap-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            full_name: user.user_metadata?.name ?? null,
            role: roleFromWaitlist,
          }),
        });

        if (!bp.ok) {
          await secopsLogViaRpc(supabase, {
            userId: session.user.id,
            route: '/auth/callback',
            reason: 'bootstrap_profile_failed',
            severity: 'high',
            meta: { status: bp.status },
          });
        }

        // 6) Go in (now middleware sees cookies and lets you through)
        const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
        router.replace(next);
      } catch (err) {
        // hard failure → log
        await secopsLogViaRpc(supabase, {
          userId: null,
          route: '/auth/callback',
          reason: 'no_session_after_callback',
          severity: 'high',
        });
        console.error('[Auth callback error]', err);
        router.replace('/login');
      }
    };

    run();
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in…</div>;
}