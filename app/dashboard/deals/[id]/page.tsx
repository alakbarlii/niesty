'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

type DealStatus = 'pending' | 'accepted' | 'rejected';

interface Deal {
  id: string;
  message: string;
  status: DealStatus;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_info?: {
    full_name: string;
    username: string;
  };
  receiver_info?: {
    full_name: string;
    username: string;
  };
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeal = useCallback(async () => {
    setLoading(true);

    const { data, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();

    if (dealError || !data) {
      setError('Deal not found.');
      setLoading(false);
      return;
    }

    const userIds = [data.sender_id, data.receiver_id];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds);

    const sender = profiles?.find((p) => p.id === data.sender_id);
    const receiver = profiles?.find((p) => p.id === data.receiver_id);

    setDeal({
      ...data,
      sender_info: sender,
      receiver_info: receiver,
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (error || !deal) return <div className="p-6 text-center text-red-500">{error}</div>;

  const statusSteps = ['sent', 'accepted', 'in progress', 'completed'];
  const currentIndex = deal.status === 'pending' ? 0 : deal.status === 'accepted' ? 1 : 2;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Deal Details</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">From</p>
        <Link
          href={`/dashboard/view/${deal.sender_info?.username}`}
          className="text-blue-600 hover:underline font-semibold"
        >
          {deal.sender_info?.full_name} (@{deal.sender_info?.username})
        </Link>

        <p className="text-sm text-gray-500 mt-4 mb-1">To</p>
        <Link
          href={`/dashboard/view/${deal.receiver_info?.username}`}
          className="text-blue-600 hover:underline font-semibold"
        >
          {deal.receiver_info?.full_name} (@{deal.receiver_info?.username})
        </Link>

        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-1">Message</p>
          <p className="text-gray-800 text-[15px] leading-relaxed">{deal.message}</p>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-1">Status</p>
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
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-1">Created</p>
          <p className="text-xs text-gray-400">
            {new Date(deal.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {statusSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  i <= currentIndex ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-sm capitalize">{step}</span>
              {i < statusSteps.length - 1 && <div className="w-6 h-px bg-gray-300" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
