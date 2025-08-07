'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HeartbeatClient() {
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateOnlineStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Mark user as online
      await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      // Repeat every 30 seconds
      interval = setInterval(async () => {
        await supabase
          .from('profiles')
          .update({
            last_seen: new Date().toISOString(),
          })
          .eq('id', session.user.id);
      }, 30000);
    };

    const handleExit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', session.user.id);
    };

    updateOnlineStatus();
    window.addEventListener('beforeunload', handleExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, []);

  return null;
}
