
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HeartbeatClient() {
  useEffect(() => {
    const updateStatus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return;

      const userId = session.user.id;

      await supabase
        .from('profiles')
        .update({ 
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);
    };

    const markOffline = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return;

      const userId = session.user.id;
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('user_id', userId);
    };

    updateStatus(); // Mark active immediately

    const interval = setInterval(updateStatus, 30000); // Repeat every 30s

    window.addEventListener('beforeunload', markOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
    };
  }, []);

  return null;
}
