// app/admin/reports/page.tsx
import { cookies } from 'next/headers';
import Link from 'next/link';

type ReportRow = {
  id: string;
  reported_user: string | null;
  message: string | null;
  created_at: string;
  reporter_id?: string | null;
  status?: string | null;
};

async function getReports(): Promise<ReportRow[]> {
  const res = await fetch('/api/admin/reports', {
    cache: 'no-store',
    headers: { cookie: cookies().toString() },
  });
  if (!res.ok) throw new Error(`/api/admin/reports ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: ReportRow[] };
  return json.data ?? [];
}

export default async function AdminReportsPage() {
  const reports = await getReports();

  return (
    <main className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin • Reports</h1>
        <Link href="/admin" className="text-blue-400 underline">Back</Link>
      </div>

      {reports.length === 0 ? (
        <p className="text-gray-400">No reports.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Reported User</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-3">{r.id}</td>
                  <td className="p-3">{r.reported_user ?? '—'}</td>
                  <td className="p-3">{r.message ?? '—'}</td>
                  <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}