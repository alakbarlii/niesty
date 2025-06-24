'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, FileText, User, Settings, BarChart2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell /> },
  { href: '/dashboard/search', label: 'Search', icon: <Search /> },
  { href: '/dashboard/deals', label: 'Deals', icon: <FileText /> },
  { href: '/dashboard/profile', label: 'Profile', icon: <User /> },
  { href: '/dashboard/earnings', label: 'Earnings', icon: <BarChart2 /> },
  { href: '/dashboard/settings', label: 'Settings', icon: <Settings /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[80px] sm:w-[100px] lg:w-[120px] bg-[#010718] border-r border-white/5 py-6 flex flex-col items-center justify-between min-h-screen">
      <div className="flex flex-col items-center gap-8 w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className="w-full flex justify-center">
              <div
                className={`flex items-center justify-center w-[48px] h-[48px] rounded-lg transition 
                  ${isActive ? 'bg-yellow-400 text-black font-bold scale-110' : 'text-white opacity-70 hover:opacity-100'}
                `}
              >
                {item.icon}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
