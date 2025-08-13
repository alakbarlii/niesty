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
      const email = (user.email || '').toLowerCase();

      // 1) Ensure the email is in waitlist (server-side check)
      try {
        const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || !json.ok) {
          // Not in waitlist → back to login
          router.replace('/login');
          return;
        }

        const role: 'creator' | 'business' | null = json.role ?? null;

        // 2) If profile exists, redirect to dashboard
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          router.replace('/login');
          return;
        }

        if (!existingProfile) {
          // 3) Create profile for this user (RLS policy allows self insert/update)
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email,
              role,
              full_name: user.user_metadata?.name || null,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            // If insert fails (e.g., unique constraints), still try to proceed
            // so the user isn't stuck.
            // console.error('Profile insert error:', insertError.message);
          }
        }

        // 4) Go to dashboard
        router.replace('/dashboard');
      } catch {
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in...</div>;
}