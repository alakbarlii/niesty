// app/dashboard/layout.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, User, DollarSign, Briefcase } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const cleanupTimer = useRef<number | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('[❌ GetUser ERROR]', error.message);
          return;
        }
        if (data?.user?.id) {
          setUserId(data.user.id);
        }
      } catch (err) {
        console.error('[❌ GetUser EXCEPTION]', err);
      }
    };
    getUser();
  }, []);

  // Heartbeat only if userId exists
  useHeartbeat(userId);

  // Throttled stale "online" cleanup — only when tab is visible
  useEffect(() => {
    if (!userId) return;

    const runCleanup = async () => {
      try {
        // lightweight: let the RPC be SECURITY DEFINER on the DB so this call is cheap
        const { error } = await supabase.rpc('fix_stale_online_flags');
        if (error) console.error('[❌ RPC ERROR]', error.message);
      } catch (err) {
        console.error('[❌ RPC EXCEPTION]', err);
      }
    };

    const start = () => {
      if (cleanupTimer.current !== null) return;
      // run once immediately, then every 60s (was 10s)
      runCleanup();
      cleanupTimer.current = window.setInterval(runCleanup, 60_000);
    };

    const stop = () => {
      if (cleanupTimer.current !== null) {
        clearInterval(cleanupTimer.current);
        cleanupTimer.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    // start only if visible
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    // cleanup on unmount/tab close
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, [userId]);

  const navItems = [
    { icon: <Search size={22} />, path: '/dashboard/search' },
    { icon: <Briefcase size={22} />, path: '/dashboard/deals' },
    { icon: <DollarSign size={22} />, path: '/dashboard/earnings' },
    { icon: <Bell size={22} />, path: '/dashboard/notifications' },
    { icon: <User size={22} />, path: '/dashboard/profile' },
  ];

  // Reset scroll on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#00040E] text-white flex flex-col">
      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex-1 p-4">{children}</div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0c0c14] border-t border-white/10 backdrop-blur-sm z-50 flex justify-around py-3">
        {navItems.map(({ icon, path }) => (
          <button
            key={path}
            onClick={() => router.push(path)}
            className={`flex flex-col items-center ${
              pathname === path ? 'text-yellow-400' : 'text-white/60'
            }`}
          >
            {icon}
          </button>
        ))}
      </nav>
    </div>
  );
}