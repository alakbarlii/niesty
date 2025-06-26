'use client';
import { Bell } from 'lucide-react';

export default function NotificationIcon({ hasUnseen = true }: { hasUnseen?: boolean }) {
  return (
    <div className="relative">
      <Bell className="w-6 h-6 text-white" />
      
      {hasUnseen && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-[16px] h-[16px] flex items-center justify-center rounded-full">
          ●
        </span>
      )}
    </div>
  );
}
