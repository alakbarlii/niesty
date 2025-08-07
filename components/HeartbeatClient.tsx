// ✅ FILE: components/HeartbeatClient.tsx
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HeartbeatClient() {
  useEffect(() => {
    const interval: NodeJS.Timeout = setInterval(() => {
      updateStatus();
    }, 30000); // Every 30s

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
        .eq('id', userId);
    };

    const handleExit = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return;

      const userId = session.user.id;
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', userId);
    };

    updateStatus(); // Immediately mark online

    window.addEventListener('beforeunload', handleExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, []);

  return null;
} //erghgi
