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
      .select('*') // ← No join here
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (dealsError) {
      setError('Failed to fetch deals.');
      setLoading(false);
      return;
    }

    setDeals(data as CleanDeal[]);
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
                className="border p-4 rounded-md shadow-sm bg-white hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">
                      {isSender ? 'You sent this deal' : 'You received this deal'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(deal.created_at).toLocaleString()}
                    </p>
                    <p className="mt-2 text-gray-800 text-sm">{deal.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-sm px-3 py-1 rounded-full capitalize font-medium ${
                        deal.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : deal.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {deal.status}
                    </span>

                    {isReceiver && isPending && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => updateStatus(deal.id, 'accepted')}
                          disabled={updatingId === deal.id}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          {updatingId === deal.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => updateStatus(deal.id, 'rejected')}
                          disabled={updatingId === deal.id}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
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
