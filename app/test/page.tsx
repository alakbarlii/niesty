'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function ProtectedPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth error:", error);
        setUser(null);
        return;
      }
      setUser(data?.user ?? null);
    }
    loadUser();
  }, []);

  if (!user) return <p className="text-white">Not logged in</p>;

  return (
    <p className="text-white">
      Welcome {user.email}, you are logged in ✅
    </p>
  );
}
