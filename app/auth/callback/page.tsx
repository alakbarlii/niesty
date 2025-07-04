'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const handleLogin = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        router.replace('/login');
        return;
      }

      const user = session.user;

      // Check if profile exists (match by ID = user.id)
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Profile fetch error:', fetchError.message);
        router.replace('/login');
        return;
      }

      if (!existingProfile) {
        // Get waitlist data
        const { data: waitlistEntry, error: waitlistError } = await supabase
          .from('waitlist')
          .select('email, role')
          .eq('email', user.email)
          .single();

        if (waitlistError || !waitlistEntry) {
          console.error('No matching waitlist entry found.');
          router.replace('/login');
          return;
        }

        // Create new profile (with manual ID)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id, 
            email: user.email,
            role: waitlistEntry.role,
            name: user.user_metadata?.name || '',
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error inserting profile:', insertError.message);
          router.replace('/login');
          return;
        }
      }

      // Success — redirect to dashboard
      router.replace('/dashboard');
    };

    handleLogin();
  }, [router]);

  return (
    <div className="text-white text-center p-10">Logging you in...</div>
  );
}
