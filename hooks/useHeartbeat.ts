'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(async () => {
      console.log('[HEARTBEAT] Attempting update for:', userId);

      const { error } = await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('[HEARTBEAT ERROR]', error.message);
      } else {
        console.log('[HEARTBEAT] Success');
      }
    }, 60000); // every 60 seconds

    return () => clearInterval(interval);
  }, [userId]);
}
