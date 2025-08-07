import './globals.css';
import { Inter } from 'next/font/google';
import { SupabaseProvider } from '@/lib/supabase/supabase-provider';
import HeartbeatClient from '@/components/HeartbeatClient'; 

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          <HeartbeatClient /> 
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
