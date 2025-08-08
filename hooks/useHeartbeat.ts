'use client';

import { useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthChangeEvent } from '@supabase/supabase-js';

// Type-safe UUID
function uuidv4(): string {
  type CryptoLike = { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => void };
  const g = globalThis as { crypto?: CryptoLike };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  if (g.crypto?.getRandomValues) {
    const buf = new Uint8Array(16);
    g.crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-';
    else {
      const r = (Math.random() * 16) | 0;
      const v = i === 14 ? 4 : i === 19 ? (r & 3) | 8 : r;
      s += v.toString(16);
    }
  }
  return s;
}

export function useHeartbeat(userId: string | null) {
  const sessionId = useMemo(() => uuidv4(), []);

  useEffect(() => {
    if (!userId) return;

    const markOnline = async () => {
      await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
          current_session_id: sessionId,
        })
        .eq('user_id', userId) //  correct column
        // only this session (or empty) can set online to avoid late-req revival
        .or(`current_session_id.is.null,current_session_id.eq.${sessionId}`);
    };

    const markOffline = async () => {
      await supabase
        .from('profiles')
        .update({
          is_online: false,
          current_session_id: null, // release ownership
        })
        .eq('user_id', userId)
        .eq('current_session_id', sessionId); // only the owning session can clear
    };

    // immediate write, not 8s later
    void markOnline();
    const interval = window.setInterval(markOnline, 8000);

    const { data: authSub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'SIGNED_OUT') void markOffline();
    });

    const onBeforeUnload = () => { void markOffline(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void markOffline();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      authSub?.subscription?.unsubscribe?.();
      void markOffline();
    };
  }, [userId, sessionId]);
}
