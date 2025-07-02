'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SettingsPage() {
  const router = useRouter();
  const [editHref, setEditHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchRole = async () => {
      try {
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          return;
        }

        const userId = session?.user?.id;
        const email = session?.user?.email;
        if (!userId) return;

        setUserEmail(email ?? null);

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Role fetch error:', error);
          return;
        }

        if (data?.role === 'creator') {
          setEditHref('/dashboard/profile/creator/edit');
        } else if (data?.role === 'business') {
          setEditHref('/dashboard/profile/business/edit');
        }
      } catch (err) {
        console.error('Unexpected error during fetchRole:', err);
      } finally {
        setLoading(false);
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

      {userEmail && (
        <p className="text-sm text-gray-300 mb-4">Logged in as: <span className="font-medium">{userEmail}</span></p>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 animate-pulse">Loading settings...</div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}