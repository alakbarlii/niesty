'use client';

import { CheckCircle, Clock, XCircle, Loader } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

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

    // Sort: rejected last, then finished (payment released), then in-progress
    const sortedDeals = dealsWithUsers.sort((a, b) => {
      const getSortValue = (deal: Deal) => {
        if (deal.status === 'rejected') return 2;
        if (deal.deal_stage === 'Payment Released') return 1;
        return 0;
      };
      return getSortValue(a) - getSortValue(b);
    });

    setDeals(sortedDeals);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleUpdateStatus = async (dealId: string, status: 'accepted' | 'rejected') => {
    await supabase.from('deals').update({ status }).eq('id', dealId);
    fetchDeals();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">Your Deals</h1>

      {loading ? (
        <div className="text-center text-white/60 flex items-center justify-center gap-2">
          <Loader className="animate-spin w-4 h-4" />
          Loading deals...
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : deals.length === 0 ? (
        <div className="text-center text-white/50">No deals yet.</div>
      ) : (
        <ul className="space-y-5">
          {deals.map((deal) => {
            const isSender = userId === deal.sender_id;
            const isReceiver = userId === deal.receiver_id;
            const otherParty = isSender ? deal.receiver_info : deal.sender_info;
            const currentStageIndex = DEAL_STAGES.indexOf(deal.deal_stage);
            const stageProgress = ((currentStageIndex + 1) / DEAL_STAGES.length) * 100;

            const statusIcon =
              deal.status === 'accepted' ? (
                <CheckCircle className="text-emerald-400 w-4 h-4 mr-1" />
              ) : deal.status === 'pending' ? (
                <Clock className="text-yellow-400 w-4 h-4 mr-1" />
              ) : (
                <XCircle className="text-red-500 w-4 h-4 mr-1" />
              );

            return (
              <li
                key={deal.id}
                className="bg-white/5 border border-white/10 backdrop-blur-xl text-white rounded-2xl p-5 shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-lg transition-all duration-300"
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
                          ? 'bg-yellow-400 text-black border-yellow-400'
                          : deal.status === 'accepted'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-red-600 text-white border-red-600'
                      }`}
                    >
                      {deal.status}
                    </span>
                  </div>

                  <p className="text-sm text-white/70 line-clamp-2 mb-2">
                    {deal.message}
                  </p>

                  <div className="text-xs text-white/50">
                    Sent on: {new Date(deal.created_at).toLocaleDateString()} ·{' '}
                    <br className="md:hidden" />Stage: <span className="text-white/80">{deal.deal_stage}</span>
                  </div>

                  <div className="relative mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${stageProgress}%` }}
                    />
                  </div>
                </a>

                {isReceiver && deal.status === 'pending' && (
                  <div className="mt-5 flex justify-center gap-4">
                     <button
                      onClick={() => handleUpdateStatus(deal.id, 'rejected')}
                      className="text-sm font-semibold px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-sm transition"
                    >
                      Reject Deal
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(deal.id, 'accepted')}
                      className="text-sm font-semibold px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm transition"
                    >
                      Accept Deal
                    </button>
                   
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
