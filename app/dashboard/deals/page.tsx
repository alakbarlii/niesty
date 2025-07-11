"use client";

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Sender {
  full_name: string;
  username: string;
}

interface Deal {
  id: string;
  message: string;
  status: string;
  sender: Sender;
}

interface RawDeal {
  id: string;
  message: string;
  status: string;
  sender: {
    full_name: string;
    username: string;
  } | null;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchDeals = useCallback(async () => {
    setRefreshing(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Failed to get user:', userError);
      setDeals([]);
      setRefreshing(false);
      return;
    }

    const { data, error: dealsError } = await supabase
      .from('deals')
      .select(`id, message, status, sender:sender_id(full_name, username)`)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
      setDeals([]);
      setRefreshing(false);
      return;
    }

    const mappedDeals: Deal[] = (data as unknown as RawDeal[]).map((deal) => ({
      id: deal.id,
      message: deal.message,
      status: deal.status,
      sender: {
        full_name: deal.sender?.full_name ?? 'Unknown',
        username: deal.sender?.username ?? 'unknown',
      },
    }));

    setDeals(mappedDeals);
    setRefreshing(false);
  }, [supabase]);

  const handleStatusUpdate = async (dealId: string, newStatus: string) => {
    const { error } = await supabase
      .from('deals')
      .update({ status: newStatus })
      .eq('id', dealId);

    if (error) {
      console.error('Failed to update deal status:', error);
    } else {
      fetchDeals();
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-4">Your Deals</h1>
      <p className="text-lg opacity-80 mb-6">You can track your sponsorship deals here.</p>

      {deals === null || refreshing ? (
        <p className="text-gray-400">Loading...</p>
      ) : deals.length === 0 ? (
        <p className="text-gray-400">No deals yet.</p>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-white"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-md font-semibold text-yellow-400">
                    {deal.sender.full_name} (@{deal.sender.username})
                  </p>
                  <p className="text-sm mt-1 text-gray-300">{deal.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium uppercase ${
                      deal.status === 'pending'
                        ? 'bg-yellow-500 text-black'
                        : deal.status === 'accepted'
                        ? 'bg-green-600'
                        : 'bg-red-600'
                    }`}
                  >
                    {deal.status}
                  </span>
                  {deal.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusUpdate(deal.id, 'accepted')}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(deal.id, 'rejected')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
