'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HeartbeatClient() {
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (!isMounted) return;
      updateStatus();
    }, 30000); // every 30s

    const updateStatus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return;

      const userId = session.user.id;
      const now = new Date().toISOString();

      await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: now,
        })
        .eq('user_id', userId);
    };

    const handleExit = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return;

      const userId = session.user.id;
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('user_id', userId);
    };

    // Initial run
    updateStatus();
    window.addEventListener('beforeunload', handleExit);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, []);

  return null;
}
