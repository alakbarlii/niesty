'use client';

import { useEffect, useState } from 'react';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, User, DollarSign, Briefcase } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

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

  // Clean up stale "online" flags
  useEffect(() => {
    if (!userId) return;

    const cleanupStaleUsers = async () => {
      try {
        const { error } = await supabase.rpc('fix_stale_online_flags');
        if (error) {
          console.error('[❌ RPC ERROR]', error.message);
        }
      } catch (err) {
        console.error('[❌ RPC EXCEPTION]', err);
      }
    };

    cleanupStaleUsers();
    const interval = setInterval(cleanupStaleUsers, 10000); // every 10s
    return () => clearInterval(interval);
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
