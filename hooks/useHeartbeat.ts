
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const updateStatus = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) console.error('[HEARTBEAT INIT ERROR]', error.message);
    };

    updateStatus();

    const interval = setInterval(async () => {
      const now = new Date();

      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: now.toISOString(),
        })
        .eq('user_id', userId);

      if (error) console.error('[HEARTBEAT INTERVAL ERROR]', error.message);
    }, 30000);

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
