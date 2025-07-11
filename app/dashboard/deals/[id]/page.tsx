'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Profile {
  id: string;
  full_name: string;
  username: string;
}

interface DealDetail {
  id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender_info?: Profile;
  receiver_info?: Profile;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<'accepted' | 'rejected' | null>(null);

  const fetchDeal = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }
    setUserId(user.id);

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

    setDeal({ ...data, sender_info: sender, receiver_info: receiver });
    setLoading(false);
  }, [id]);

  const updateStatus = async (status: 'accepted' | 'rejected') => {
    if (!deal) return;
    setUpdating(status);
    await supabase.from('deals').update({ status }).eq('id', deal.id);
    setUpdating(null);
    fetchDeal();
  };

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading deal...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!deal) return null;

  const isReceiver = userId === deal.receiver_id;
  const isPending = deal.status === 'pending';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="border border-gray-200 bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Deal Details</h2>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full capitalize border ${
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

        <p className="text-sm text-gray-400 mb-2">
          Sent on {new Date(deal.created_at).toLocaleString()}
        </p>

        <div className="text-sm text-gray-700 mb-2">
          <strong>From:</strong>{' '}
          <a
            href={`/dashboard/view/${deal.sender_info?.username}`}
            className="text-blue-600 hover:underline"
            target="_blank"
          >
            {deal.sender_info?.full_name}
          </a>
        </div>

        <div className="text-sm text-gray-700 mb-4">
          <strong>To:</strong>{' '}
          <a
            href={`/dashboard/view/${deal.receiver_info?.username}`}
            className="text-blue-600 hover:underline"
            target="_blank"
          >
            {deal.receiver_info?.full_name}
          </a>
        </div>

        <p className="text-gray-900 text-[15px] leading-relaxed whitespace-pre-line">
          {deal.message}
        </p>

        {isReceiver && isPending && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => updateStatus('accepted')}
              disabled={updating === 'accepted'}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
            >
              {updating === 'accepted' ? 'Accepting...' : 'Accept'}
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={updating === 'rejected'}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700"
            >
              {updating === 'rejected' ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
