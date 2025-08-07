'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';


export default function SettingsPage() {
  const router = useRouter();
  const [editHref, setEditHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    

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
   

    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto text-white">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Settings</h1>

      {userEmail && (
        <p className="text-sm sm:text-base text-gray-300 mb-4">
          Logged in as: <span className="font-medium">{userEmail}</span>
        </p>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 animate-pulse">
          Loading settings...
        </div>
      ) : (
        <>
          {editHref && (
            <div className="mb-4">
              <button
                onClick={() => router.push(editHref)}
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition text-sm sm:text-base"
              >
                Edit Profile
              </button>
            </div>
          )}

          <div className="mt-2">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition text-sm sm:text-base"
            >
              Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
