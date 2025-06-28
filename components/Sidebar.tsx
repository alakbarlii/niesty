'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, FileText, User, Settings, BarChart2 } from 'lucide-react';
import Image from 'next/image';
import NotificationIcon from '@/components/NotificationIcon';


const navItems = [
    { href: '/dashboard/notifications', label: 'Notifications', icon: <NotificationIcon hasUnseen={false} /> },
    { href: '/dashboard/search', label: 'Search', icon: <Search /> },
    { href: '/dashboard/deals', label: 'Deals', icon: <FileText /> },
    { href: '/dashboard/profile/creator/view', label: 'Profile', icon: <User /> },
    { href: '/dashboard/earnings', label: 'Earnings', icon: <BarChart2 /> },
  ];
  

const bottomItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: <Settings /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[80px] lg:w-[250px] bg-[#010718] border-r border-white/5 py-6 flex flex-col justify-between min-h-screen transition-all duration-200 ">
      {/* Top: Logo */}
      <div className="flex items-center justify-center lg:justify-start px-2 lg:px-4">
      <Image
  src="/niesty_header.png"
  alt="Niesty Logo"
  width={70}
  height={70}
  className="h-[70px] w-auto m-1 p-0 -translate-y-1" 
  priority
/>

        <span className="text-white font-semibold text-[30px] leading-none -ml-3.5 hidden lg:inline-block">Niesty</span>
      </div>

      {/* Middle: Main Nav */}
      <div className="flex flex-col items-center lg:items-start gap-6 px-2 lg:px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="w-full">
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-yellow-400 text-black font-bold scale-105' : 'text-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="text-xl">{item.icon}</div>
                <span className="hidden lg:inline-block text-base">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom: Settings */}
      <div className="flex flex-col items-center lg:items-start gap-6 px-2 lg:px-4">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="w-full">
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-yellow-400 text-black font-bold scale-105' : 'text-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="text-xl">{item.icon}</div>
                <span className="hidden lg:inline-block text-base">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
