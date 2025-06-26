"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Handshake,
  User,
  BarChart2
} from "lucide-react";

const navItems = [
  { href: "/dashboard/search", icon: Search, label: "Search" },
  { href: "/dashboard/deals", icon: Handshake, label: "Deals" },
  { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
  { href: "/dashboard/earnings", icon: BarChart2, label: "Earnings" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#010718] border-t border-white/10 flex justify-around items-center py-2 lg:hidden">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center text-xs ${
              isActive ? "text-yellow-400 font-semibold" : "text-white/70"
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
