'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    console.log(' Waiting for auth state...');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        console.warn('⚠️ No session found after redirect.');
        router.replace('/login');
        return;
      }

      const user = session.user;
      console.log(' Session restored:', user.email, user.id);

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Fetch profile error:', fetchError.message);
        router.replace('/login');
        return;
      }

      if (existingProfile) {
        console.log(' Existing profile found. Redirecting to dashboard...');
        router.replace('/dashboard');
        return;
      }

      console.log('ℹ️ No profile found. Checking waitlist...');

      const { data: waitlistEntry, error: waitlistError } = await supabase
        .from('waitlist')
        .select('email, role')
        .eq('email', user.email)
        .single();

      if (waitlistError || !waitlistEntry) {
        console.error('❌ Waitlist fetch failed:', waitlistError?.message || 'not found');
        router.replace('/login');
        return;
      }

      console.log(' Waitlist entry found:', waitlistEntry);

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          role: waitlistEntry.role,
          name: user.user_metadata?.name || '',
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('❌ Profile insert error:', insertError.message);
        router.replace('/login');
        return;
      }

      console.log(' New profile inserted successfully. Redirecting to dashboard...');
      router.replace('/dashboard');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <div className="text-white text-center p-10">Logging you in...</div>;
}
