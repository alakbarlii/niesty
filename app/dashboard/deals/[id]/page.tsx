'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Deal {
  id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender_info?: {
    full_name: string;
    username: string;
  };
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchSenderInfos = async (deals: Deal[]) => {
    const senderIds = [...new Set(deals.map((d) => d.sender_id))];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', senderIds);

    if (error || !data) return deals;

    const senderMap = new Map(data.map((u) => [u.id, u]));

    return deals.map((deal) => ({
      ...deal,
      sender_info: senderMap.get(deal.sender_id),
    }));
  };

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('Failed to fetch user.');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (dealsError || !data) {
      setError('Failed to fetch deals.');
      setLoading(false);
      return;
    }

    const rawDeals = data as Deal[];
    const dealsWithSenders = await fetchSenderInfos(rawDeals);
    setDeals(dealsWithSenders);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Deals</h1>

      {loading ? (
        <div className="text-center text-gray-500">Loading deals...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : deals.length === 0 ? (
        <div className="text-center text-gray-400">No deals yet.</div>
      ) : (
        <ul className="space-y-5">
          {deals.map((deal) => {
            const isSender = userId === deal.sender_id;
            const otherPartyName = deal.sender_info?.full_name || 'Someone';
            const statusColor =
              deal.status === 'pending'
                ? 'border-yellow-400 bg-yellow-50'
                : deal.status === 'accepted'
                ? 'border-green-500 bg-green-50'
                : 'border-red-400 bg-red-50';

            return (
              <li
                key={deal.id}
                className={`relative group border-l-4 ${statusColor} rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200`}
              >
                <a href={`/dashboard/deals/${deal.id}`} className="block">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-600 font-medium">
                      {isSender
                        ? `Your offer to ${otherPartyName}`
                        : `${otherPartyName}'s offer to you`}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full capitalize border ${
                        deal.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : deal.status === 'accepted'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {deal.status}
                    </span>
                  </div>

                  <p className="text-gray-900 text-sm leading-relaxed line-clamp-2">
                    {deal.message}
                  </p>

                  <div className="mt-4 space-y-1 text-xs text-gray-500">
                    <p className="font-medium">Deal Progress</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-3">
                      <li className="text-gray-700">Request Sent</li>
                      <li className={deal.status !== 'pending' ? 'text-gray-700' : 'text-gray-300'}>
                        Negotiate Terms
                      </li>
                      <li className={deal.status === 'accepted' ? 'text-gray-700' : 'text-gray-300'}>
                        Confirm Agreement
                      </li>
                      <li className="text-gray-300">Platform Escrow</li>
                      <li className="text-gray-300">Content Submitted</li>
                      <li className="text-gray-300">Approval & Review</li>
                      <li className="text-gray-300">Payment Released</li>
                    </ol>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Sent {new Date(deal.created_at).toLocaleString()}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
