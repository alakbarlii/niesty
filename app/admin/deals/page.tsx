// app/admin/deals/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';

type DealRow = {
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

function money(n: number | null | undefined): string {
  const v = typeof n === 'number' ? n : 0;
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

async function getDeals(): Promise<DealRow[]> {
  const res = await fetch('/api/admin/deals', {
    cache: 'no-store',
    headers: { cookie: cookies().toString() },
  });
  if (!res.ok) throw new Error(`/api/admin/deals ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: DealRow[] };
  return json.data ?? [];
}

export default async function AdminDealsPage() {
  const deals = await getDeals();

  return (
    <main className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin • Deals</h1>
        <Link href="/admin" className="text-blue-400 underline">Back</Link>
      </div>

      {deals.length === 0 ? (
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
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-t border-white/10">
                  <td className="p-3">
                    <div className="font-medium">{d.deal_id ?? '—'}</div>
                    <div className="text-xs text-gray-400 line-clamp-1">{d.message ?? '—'}</div>
                  </td>
                  <td className="p-3">
                    <span className="text-blue-300">{d.sender_name ?? 'Unknown'}</span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-blue-300">{d.receiver_name ?? 'Unknown'}</span>
                  </td>
                  <td className="p-3">{d.deal_stage ?? '—'}</td>
                  <td className="p-3">{money(d.deal_value)}</td>
                  <td className="p-3">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <Link href={`/admin/deals/${d.id}`} className="text-emerald-400 underline">
                      View / Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}