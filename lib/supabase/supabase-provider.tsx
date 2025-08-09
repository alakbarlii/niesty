'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type Ctx = { ready: boolean; session: Session | null };

const SupabaseContext = createContext<Ctx>({ ready: false, session: null });

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<Ctx>({ ready: false, session: null });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setState({ ready: true, session: data.session ?? null });
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({ ready: true, session: session ?? null });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={state}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSession = () => useContext(SupabaseContext);
