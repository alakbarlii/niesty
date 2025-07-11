"use client";

import { useEffect, useState } from 'react';
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchDeals = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Failed to get user:', userError);
        setDeals([]);
        return;
      }

      const { data, error: dealsError } = await supabase
        .from('deals')
        .select(`id, message, status, sender:sender_id(full_name, username)`) // single object
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (dealsError) {
        console.error('Error fetching deals:', dealsError);
        setDeals([]);
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
    };

    fetchDeals();
  }, [supabase]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-4">Your Deals</h1>
      <p className="text-lg opacity-80 mb-6">You can track your sponsorship deals.</p>

      {deals === null ? (
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
