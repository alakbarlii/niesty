'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.getSession();

      if (!error) {
        router.replace('/dashboard'); // or your target after login
      } else {
        console.error('Login error:', error.message);
        router.replace('/login');
      }
    };

    handleAuth();
  }, [router]);

  return <p className="text-white text-center mt-10">Completing login...</p>;
}
