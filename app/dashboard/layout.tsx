'use client';

import { useEffect, useState } from 'react';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { supabase } from '@/lib/supabase'; 

import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, User, DollarSign, Briefcase } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  useHeartbeat(userId);

  useEffect(() => {
    const cleanupStaleUsers = async () => {
      const { error } = await supabase.rpc('fix_stale_online_flags');
      if (error) {
        console.error('[❌ RPC ERROR] fix_stale_online_flags:', error.message);
      } else {
        console.log('[✅ RPC CALLED] fix_stale_online_flags');
      }
    };
  
    cleanupStaleUsers(); // Run immediately
    const interval = setInterval(cleanupStaleUsers, 60000); // Repeat every 60s
  
    return () => clearInterval(interval);
  }, []);
  

  const navItems = [
    { icon: <Search size={22} />, path: '/dashboard/search' },
    { icon: <Briefcase size={22} />, path: '/dashboard/deals' },
    { icon: <DollarSign size={22} />, path: '/dashboard/earnings' },
    { icon: <Bell size={22} />, path: '/dashboard/notifications' },
    { icon: <User size={22} />, path: '/dashboard/profile' },
  ];

  useEffect(() => {
    window.scrollTo(0, 0); // Mobile UX fix
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#00040E] text-white flex flex-col">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden flex-1 p-4">{children}</div>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0c0c14] border-t border-white/10 backdrop-blur-sm z-50 flex justify-around py-3">
        {navItems.map(({ icon, path }) => (
          <button
            key={path}
            onClick={() => router.push(path)}
            className={`flex flex-col items-center text-white ${
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
