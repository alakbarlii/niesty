'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader } from 'lucide-react';

interface Deal {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  deal_stage: string;
  created_at: string;
  sender_info?: { full_name: string; username: string };
  receiver_info?: { full_name: string; username: string };
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('deals')
        .select('*, sender_info:profiles!deals_sender_id_fkey(full_name,username), receiver_info:profiles!deals_receiver_id_fkey(full_name,username)')
        .order('created_at', { ascending: false });

      if (!data || error) {
        setDeals([]);
      } else {
        setDeals(data);
      }

      setLoading(false);
    };

    fetchDeals();
  }, []);

  if (loading)
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader className="w-4 h-4 animate-spin" /> Loading deals...
      </div>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Your Deals</h1>

      {deals.length === 0 ? (
        <p className="text-gray-400">No deals found.</p>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-gray-900 text-white rounded-xl shadow-sm p-5 hover:shadow-md transition duration-200 cursor-pointer border border-gray-800"
              onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">
                  {userId === deal.sender_id
                    ? `Your offer to ${deal.receiver_info?.full_name}`
                    : `${deal.sender_info?.full_name}'s offer to you`}
                </div>
                <span
                  className={`capitalize text-xs font-semibold px-2 py-1 rounded ${
                    deal.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : deal.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {deal.status}
                </span>
              </div>

              <p className="text-sm text-gray-300 line-clamp-2 mb-2">{deal.message}</p>

              <div className="text-xs text-gray-500">
                Sent on: {new Date(deal.created_at).toLocaleDateString()} ·{' '}
                Stage: <span className="text-gray-300">{deal.deal_stage}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
