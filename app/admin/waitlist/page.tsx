// app/admin/waitlist/page.tsx
import { cookies } from 'next/headers';
import Link from 'next/link';

type WaitlistRow = {
  id: string;
  email: string | null;
  role: string | null;
  reg_time: string;
};

async function getWaitlist(): Promise<WaitlistRow[]> {
  const res = await fetch('/api/admin/waitlist', {
    cache: 'no-store',
    headers: { cookie: cookies().toString() },
  });
  if (!res.ok) throw new Error(`/api/admin/waitlist ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: WaitlistRow[] };
  return json.data ?? [];
}

export default async function AdminWaitlistPage() {
  const rows = await getWaitlist();

  return (
    <main className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin • Waitlist</h1>
        <Link href="/admin" className="text-blue-400 underline">Back</Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-400">No waitlist entries.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Registered</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-t border-white/10">
                  <td className="p-3">{w.email ?? '—'}</td>
                  <td className="p-3">{w.role ?? '—'}</td>
                  <td className="p-3">{new Date(w.reg_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}