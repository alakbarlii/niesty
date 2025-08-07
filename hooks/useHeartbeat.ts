// hooks/useHeartbeat.ts
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 

export function useHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Heartbeat failed:', error.message);
      }
    }, 60000); // every 60 seconds

    return () => clearInterval(interval);
  }, [userId]);
}
