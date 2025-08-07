'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { SupabaseProvider } from '@/lib/supabase/supabase-provider';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Niesty',
  description: 'Sponsor deals made simple',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateOnlineStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Mark user as online + update last_seen immediately
      await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      // Then update last_seen every 30 seconds
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
      window.removeEventListener('beforeunload', handleExit);
      clearInterval(interval);
      handleExit();
    };
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
