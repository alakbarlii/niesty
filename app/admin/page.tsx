// app/admin/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';

type Deal = {
  id: string;
  deal_id: string | null;
  sender_id: string;
  receiver_id: string;
  deal_value: number | null;
  deal_stage: string | null;
  created_at: string;
  message: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  sender_role?: string | null;
  receiver_role?: string | null;
};

type User = {
  user_id: string;
  full_name: string | null;
  role: 'creator' | 'business' | null;
  created_at: string | null;
};

type Waitlist = {
  id: string;
  email: string | null;
  role: string | null;
  reg_time: string;
};

function fmtMoney(n: number | null | undefined): string {
  const v = typeof n === 'number' ? n : 0;
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

async function fetchJSON<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) throw new Error('Missing NEXT_PUBLIC_BASE_URL');
  const res = await fetch(`${base}${path}`, {
    cache: 'no-store',
    headers: { cookie: cookies().toString() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export default async function AdminDashboard() {
  const [{ data: deals }, { data: users }, { data: waitlist }] = await Promise.all([
    fetchJSON<{ data: Deal[] }>('/api/admin/deals'),
    fetchJSON<{ data: User[] }>('/api/admin/users'),
    fetchJSON<{ data: Waitlist[] }>('/api/admin/waitlist'),
  ]);

  const userCount = users.length;
  const creatorCount = users.filter(u => u.role === 'creator').length;
  const businessCount = users.filter(u => u.role === 'business').length;

  const totalDealValue = deals.reduce((sum, d) => sum + (d.deal_value ?? 0), 0);
  const completedDealValue = deals
    .filter(d => d.deal_stage === 'Payment Released')
    .reduce((sum, d) => sum + (d.deal_value ?? 0), 0);
  const pendingDealValue = totalDealValue - completedDealValue;

  const latestDeals = deals.slice(0, 10);

  return (
    <main className="p-6 text-white space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-sm text-gray-400">Users</p>
          <p className="text-2xl font-semibold">{userCount}</p>
          <p className="text-sm text-gray-400 mt-1">Creators: {creatorCount} • Businesses: {businessCount}</p>
          <Link href="/admin/users" className="text-blue-400 underline text-sm mt-2 inline-block">View users →</Link>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-sm text-gray-400">Total Deal Volume</p>
          <p className="text-2xl font-semibold">{fmtMoney(totalDealValue)}</p>
          <p className="text-sm text-gray-400 mt-1">
            Completed: {fmtMoney(completedDealValue)} • Pending: {fmtMoney(pendingDealValue)}
          </p>
          <Link href="/admin/deals" className="text-blue-400 underline text-sm mt-2 inline-block">All deals →</Link>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-sm text-gray-400">Waitlist</p>
          <p className="text-2xl font-semibold">{waitlist.length}</p>
          <p className="text-sm text-gray-400 mt-1">Latest: {waitlist[0]?.email ?? '—'}</p>
          {/* If you want a page: create /admin/waitlist and link to it */}
        </div>
      </div>

      {/* Latest deals */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest Deals</h2>
          <Link href="/admin/deals" className="text-blue-400 underline">See all</Link>
        </div>

        {latestDeals.length === 0 ? (
          <p className="text-gray-400">No deals yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-3 text-left">Deal</th>
                  <th className="p-3 text-left">Sender → Receiver</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Value</th>
                  <th className="p-3 text-left">Created</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {latestDeals.map(d => (
                  <tr key={d.id} className="border-t border-white/10">
                    <td className="p-3">
                      <div className="font-medium">{d.deal_id ?? '—'}</div>
                      <div className="text-xs text-gray-400 line-clamp-1">{d.message ?? '—'}</div>
                    </td>
                    <td className="p-3">
                      <span className="text-blue-300">{d.sender_name ?? 'Unknown'}</span>
                      <span className="text-gray-400"> → </span>
                      <span className="text-blue-300">{d.receiver_name ?? 'Unknown'}</span>
                    </td>
                    <td className="p-3">{d.deal_stage ?? '—'}</td>
                    <td className="p-3">{fmtMoney(d.deal_value)}</td>
                    <td className="p-3">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      <Link href={`/admin/deals/${d.id}`} className="text-emerald-400 underline">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}