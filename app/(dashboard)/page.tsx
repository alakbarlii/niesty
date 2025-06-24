
'use client';

import { redirect } from 'next/navigation';

export default function DashboardHome() {
  redirect('/dashboard/search');
}
