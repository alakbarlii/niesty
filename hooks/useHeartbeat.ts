'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const markOnline = async () => {
      console.log('[HEARTBEAT] Marking user online:', userId);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[HEARTBEAT INIT ERROR]', error.message);
      }
    };

    const interval = setInterval(async () => {
      console.log('[HEARTBEAT] Updating last_seen for:', userId);

      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('[HEARTBEAT INTERVAL ERROR]', error.message);
      } else {
        console.log('[HEARTBEAT] Success');
      }
    }, 30000); // every 30s like layout.

    const handleExit = async () => {
      console.log('[HEARTBEAT] Marking user offline:', userId);
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', userId);
    };

    markOnline();
    window.addEventListener('beforeunload', handleExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, [userId]);
}
