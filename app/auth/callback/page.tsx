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
        router.replace('/login');
        return;
      }

      const user = session.user;

      // 1. Check if profile already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // 2. Fetch waitlist data
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
        if (profileError) {
          console.error('Profile fetch error:', profileError.message);
        }
        

        // 3. Insert new profile
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: user.id,
          email: user.email,
          role: waitlistEntry.role,
          name: user.user_metadata?.name || '', // optional fallback
        });

        if (insertError) {
          console.error('Failed to insert profile:', insertError.message);
          router.replace('/login');
          return;
        }
      }

      // 4. All done, route to dashboard
      router.replace('/dashboard');
    };

    handleLogin();
  }, [router]);

  return (
    <div className="text-white text-center p-10">Logging you in...</div>
  );
}
