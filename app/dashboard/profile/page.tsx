'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfileRedirectPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectUser = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        // Wait a bit and try again
        setTimeout(redirectUser, 300); // retry once after 300ms
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data?.role) {
        console.error('Profile fetch error:', error?.message);
        setLoading(false);
        return;
      }

      const role = data.role;
      if (role === 'creator') {
        router.push('/dashboard/profile/creator/view');
      } else if (role === 'business') {
        router.push('/dashboard/profile/business/view');
      } else {
        setLoading(false);
      }
    };

    redirectUser();
  }, [router, supabase]);

  return (
    <div className="text-white p-6">
      {loading ? <p>Loading your profile...</p> : <p>Could not load profile.</p>}
    </div>
  );
}
