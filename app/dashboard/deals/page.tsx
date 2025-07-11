'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type DealStatus = 'pending' | 'accepted' | 'rejected';

interface CleanDeal {
  id: string;
  message: string;
  status: DealStatus;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender_info?: {
    username: string;
    full_name: string;
  };
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DealsPage() {
  const [deals, setDeals] = useState<CleanDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSenderInfos = async (deals: CleanDeal[]) => {
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

    const rawDeals = data as CleanDeal[];
    const dealsWithSenders = await fetchSenderInfos(rawDeals);
    setDeals(dealsWithSenders);
    setLoading(false);
  }, []);

  const updateStatus = async (id: string, status: DealStatus) => {
    setUpdatingId(id);
    const { error } = await supabase.from('deals').update({ status }).eq('id', id);
    setUpdatingId(null);

    if (error) {
      console.error(error.message);
      alert('Failed to update deal.');
      return;
    }

    fetchDeals();
  };

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Deals</h1>

      {loading ? (
        <div className="text-center text-gray-500">Loading deals...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : deals.length === 0 ? (
        <div className="text-center text-gray-500">No deals found.</div>
      ) : (
        <ul className="space-y-4">
          {deals.map((deal) => {
            const isReceiver = userId === deal.receiver_id;
            const isPending = deal.status === 'pending';
            const isSender = userId === deal.sender_id;

            return (
              <li
                key={deal.id}
                className="rounded-2xl border border-gray-200 bg-[#fefefe] p-5 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col space-y-2 w-full">
                    <p className="text-sm text-gray-500 font-medium">
                      {isSender && deal.sender_info
                        ? `Your offer to `
                        : deal.sender_info
                        ? `${deal.sender_info.full_name}’s offer for you`
                        : ''}
                      {deal.sender_info && (
                        <a
                          href={`/dashboard/view/${deal.sender_info.username}`}
                          target="_blank"
                          className="text-blue-600 hover:underline font-semibold ml-1"
                        >
                          {isSender ? `@${deal.sender_info.username}` : ''}
                        </a>
                      )}
                    </p>

                    <p className="text-[15px] text-gray-800 leading-relaxed">
                      {deal.message}
                    </p>

                    <p className="text-xs text-gray-400">
                      {new Date(deal.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full capitalize border ${
                        deal.status === 'pending'
                          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          : deal.status === 'accepted'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {deal.status}
                    </span>

                    {isReceiver && isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(deal.id, 'accepted')}
                          disabled={updatingId === deal.id}
                          className="text-sm font-medium text-green-600 hover:text-green-700"
                        >
                          {updatingId === deal.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => updateStatus(deal.id, 'rejected')}
                          disabled={updatingId === deal.id}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          {updatingId === deal.id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
