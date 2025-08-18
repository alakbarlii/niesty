'use client';

import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#00040E] text-white">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Spacer so content doesn’t slide under sidebar */}
      <div className="w-[80px] lg:w-[250px] shrink-0" />

      {/* Main content with padding */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}