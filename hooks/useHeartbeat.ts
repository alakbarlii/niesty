'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const markOnline = async () => {
      const now = new Date().toISOString();
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: now })
        .eq('user_id', userId);
    };

    const markOffline = async () => {
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('user_id', userId);
    };

    // 1. Mark online instantly
    markOnline();

    // 2. Keep updating
    const interval = setInterval(markOnline, 10000); // every 10s

    // 3. Catch tab/browser close
    window.addEventListener('beforeunload', markOffline);

    // 4. Catch explicit logout
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') markOffline();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
    };
  }, [userId]);
}
