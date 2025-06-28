'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SettingsPage() {
  const router = useRouter();
  const [editHref, setEditHref] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data?.role === 'creator') {
        setEditHref('/dashboard/profile/creator/edit');
      } else if (!error && data?.role === 'business') {
        setEditHref('/dashboard/profile/business/edit');
      }
    };

    fetchRole();
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="p-6 max-w-xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* all the settings of your account on Niesty */}

      {editHref && (
        <div className="mb-4">
          <button
            onClick={() => router.push(editHref)}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-4 rounded-lg transition"
          >
            Edit Profile
          </button>
        </div>
      )}

      <div className="mt-2">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
