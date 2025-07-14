'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CheckCircle, XCircle, Clock, Loader } from 'lucide-react';

interface Deal {
  id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender_id: string;
  receiver_id: string;
  created_at: string;
  deal_stage: string;
  sender_info?: {
    full_name: string;
    username: string;
  };
  receiver_info?: {
    full_name: string;
    username: string;
  };
}

const DEAL_STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
];

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfiles = async (ids: string[]) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', ids);

    if (error || !data) return new Map();
    return new Map(data.map((user) => [user.id, user]));
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
    const allUserIds = Array.from(
      new Set(rawDeals.flatMap((d) => [d.sender_id, d.receiver_id]))
    );

    const userMap = await fetchProfiles(allUserIds);

    const dealsWithUsers = rawDeals.map((deal) => ({
      ...deal,
      sender_info: userMap.get(deal.sender_id),
      receiver_info: userMap.get(deal.receiver_id),
    }));

    setDeals(dealsWithUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">Your Deals</h1>

      {loading ? (
        <div className="text-center text-gray-500 flex items-center justify-center gap-2">
          <Loader className="animate-spin w-4 h-4" />
          Loading deals...
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : deals.length === 0 ? (
        <div className="text-center text-gray-400">No deals yet.</div>
      ) : (
        <ul className="space-y-5">
          {deals.map((deal) => {
            const isSender = userId === deal.sender_id;
            const otherParty = isSender ? deal.receiver_info : deal.sender_info;
            const currentStageIndex = DEAL_STAGES.indexOf(deal.deal_stage);
            const stageProgress = ((currentStageIndex + 1) / DEAL_STAGES.length) * 100;

            const statusIcon =
              deal.status === 'accepted' ? (
                <CheckCircle className="text-green-500 w-4 h-4 mr-1" />
              ) : deal.status === 'pending' ? (
                <Clock className="text-yellow-500 w-4 h-4 mr-1" />
              ) : (
                <XCircle className="text-red-500 w-4 h-4 mr-1" />
              );

            return (
              <li
                key={deal.id}
                className="bg-gray-900 text-white border border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <a href={`/dashboard/deals/${deal.id}`} className="block">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium flex items-center">
                      {statusIcon}
                      {isSender
                        ? `Your offer to ${otherParty?.full_name || 'Unknown'}`
                        : `${otherParty?.full_name || 'Unknown'}'s offer to you`}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded capitalize border ${
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

                  <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                    {deal.message}
                  </p>

                  <div className="text-xs text-gray-500">
                    Sent on: {new Date(deal.created_at).toLocaleDateString()} ·{' '}
                    Stage: <span className="text-gray-300">{deal.deal_stage}</span>
                  </div>

                  <div className="relative mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${stageProgress}%` }}
                    />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
