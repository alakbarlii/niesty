'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfileRedirectPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data?.role) {
        router.push('/login');
        return;
      }

      const role = data.role;
      if (role === 'creator') {
        router.push('/dashboard/profile/creator/view');
      } else if (role === 'business') {
        router.push('/dashboard/profile/business/view');
      } else {
        router.push('/login');
      }
    };

    redirectUser();
  }, [router, supabase]);

  return (
    <div className="text-white p-6">
      <h1>Redirecting to your profile...</h1>
    </div>
  );
}
