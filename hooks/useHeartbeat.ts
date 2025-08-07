
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const updateStatus = async () => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: now,
        })
        .eq('user_id', userId);

      if (error) console.error('[HEARTBEAT INIT ERROR]', error.message);
    };

    updateStatus(); // mark online immediately

    const interval = setInterval(() => {
      updateStatus();
    }, 30000); // update every 30s

    const handleExit = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('user_id', userId);

      if (error) console.error('[HEARTBEAT EXIT ERROR]', error.message);
    };

    window.addEventListener('beforeunload', handleExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, [userId]);
}
