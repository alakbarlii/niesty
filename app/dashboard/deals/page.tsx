'use client';

import { CheckCircle, Clock, XCircle, Loader } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfileLite {
  user_id: string;           // ← FIXED
  full_name: string;
  username: string;
}

interface Deal {
  id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender_user_id: string;         // auth UID
  receiver_user_id: string;       // auth UID
  created_at: string;
  deal_stage: string;
  accepted_at?: string | null;
  sender_info?: ProfileLite | null;
  receiver_info?: ProfileLite | null;
}

const DEAL_STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
] as const;

type FilterKey = 'in-progress' | 'completed' | 'rejected' | 'all';

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // filters + confirmation UI
  const [filter, setFilter] = useState<FilterKey>('in-progress'); // default as requested
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'accept' | 'reject' | null>(null);
  const [confirmDeal, setConfirmDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ********** FIX: pull profiles by user_id and key map by user_id **********
  const fetchProfiles = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, ProfileLite>();
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, username')
      .in('user_id', ids);

    if (error || !data) return new Map<string, ProfileLite>();
    return new Map<string, ProfileLite>(data.map((u) => [u.user_id, u as ProfileLite]));
  };
  // ***************************************************************************

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      setError('Failed to fetch user.');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);

    if (dealsError || !data) {
      setError('Failed to fetch deals.');
      setLoading(false);
      return;
    }

    const rawDeals = data as Deal[];
    const allUserIds = Array.from(new Set(rawDeals.flatMap((d) => [d.sender_user_id, d.receiver_user_id])));
    const userMap = await fetchProfiles(allUserIds);

    const dealsWithUsers: Deal[] = rawDeals.map((deal) => ({
      ...deal,
      sender_info: userMap.get(deal.sender_user_id) ?? null,
      receiver_info: userMap.get(deal.receiver_user_id) ?? null,
    }));

    setDeals(dealsWithUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Filter + sort (latest on top, oldest bottom)
  const filteredSortedDeals = useMemo(() => {
    const arr = deals.filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'rejected') return d.status === 'rejected';
      if (filter === 'completed') return d.deal_stage === 'Payment Released';
      // in-progress:
      return d.status !== 'rejected' && d.deal_stage !== 'Payment Released';
    });

    // Sort by created_at DESC
    return arr.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta;
    });
  }, [deals, filter]);

  const openConfirm = (deal: Deal, kind: 'accept' | 'reject') => {
    setConfirmDeal(deal);
    setConfirmKind(kind);
    setConfirmOpen(true);
  };

  const handleAccept = async (deal: Deal) => {
    setSubmitting(true);
    try {
      await supabase
        .from('deals')
        .update({
          accepted_at: new Date().toISOString(),
          deal_stage: 'Negotiating Terms',
          status: 'accepted', // optional but clearer for inbox filter
        })
        .eq('id', deal.id);
      await fetchDeals();
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
      setConfirmDeal(null);
      setConfirmKind(null);
    }
  };

  const handleReject = async (deal: Deal) => {
    setSubmitting(true);
    try {
      await supabase.from('deals').update({ status: 'rejected' }).eq('id', deal.id);
      await fetchDeals();
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
      setConfirmDeal(null);
      setConfirmKind(null);
    }
  };

  const statusPill = (status: Deal['status']) => {
    const cls =
      status === 'pending'
        ? 'bg-yellow-400 text-black border-yellow-400'
        : status === 'accepted'
        ? 'bg-emerald-500 text-white border-emerald-500'
        : 'bg-red-600 text-white border-red-600';
    return <span className={`text-xs font-semibold px-2 py-1 rounded capitalize border ${cls}`}>{status}</span>;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-white">Your Deals</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { k: 'in-progress', label: 'In-Progress' },
          { k: 'completed', label: 'Completed' },
          { k: 'rejected', label: 'Rejected' },
          { k: 'all', label: 'All' },
        ] as { k: typeof filter; label: string }[]).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-xl text-sm border transition ${
              filter === k
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-white/60 flex items-center justify-center gap-2">
          <Loader className="animate-spin w-4 h-4" />
          Loading deals...
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : filteredSortedDeals.length === 0 ? (
        <div className="text-center text-white/50">No deals in this view.</div>
      ) : (
        <ul className="space-y-5">
          {filteredSortedDeals.map((deal) => {
            const isSender = userId === deal.sender_user_id;
            const otherParty = isSender ? deal.receiver_info : deal.sender_info;

            const currentStageIndex = DEAL_STAGES.indexOf(
              deal.deal_stage as (typeof DEAL_STAGES)[number]
            );
            const stageProgress = ((currentStageIndex + 1) / DEAL_STAGES.length) * 100;

            const statusIcon =
              deal.status === 'accepted' ? (
                <CheckCircle className="text-emerald-400 w-4 h-4 mr-1" />
              ) : deal.status === 'pending' ? (
                <Clock className="text-yellow-400 w-4 h-4 mr-1" />
              ) : (
                <XCircle className="text-red-500 w-4 h-4 mr-1" />
              );

            const canAct =
              !isSender && deal.status === 'pending' && deal.deal_stage === 'Waiting for Response';

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
                    {statusPill(deal.status)}
                  </div>

                  <p className="text-sm text-white/70 line-clamp-2 mb-2">{deal.message}</p>

                  <div className="text-xs text-white/50">
                    Sent on: {new Date(deal.created_at).toLocaleDateString()} ·{' '}
                    <br className="md:hidden" />
                    Stage: <span className="text-white/80">{deal.deal_stage}</span>
                  </div>

                  <div className="relative mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${stageProgress}%` }}
                    />
                  </div>
                </a>

                {canAct && (
                  <div className="mt-5 flex justify-center gap-4">
                    <button
                      onClick={() => openConfirm(deal, 'reject')}
                      className="text-sm font-semibold px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-sm transition"
                    >
                      Reject Deal
                    </button>
                    <button
                      onClick={() => openConfirm(deal, 'accept')}
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

      {/* One-time confirmation modal */}
      {confirmOpen && confirmDeal && confirmKind && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && setConfirmOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[92%] max-w-md">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-5 text-white">
              <h3 className="text-lg font-semibold mb-2">
                {confirmKind === 'accept' ? 'Accept this offer?' : 'Reject this offer?'}
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                {confirmKind === 'accept'
                  ? 'You can negotiate final price in Deal Agreement. This will move the deal to Negotiating Terms.'
                  : 'This will mark the offer as rejected.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  onClick={() => setConfirmOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className={`px-3 py-1.5 rounded font-semibold disabled:opacity-50 ${
                    confirmKind === 'accept'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                  onClick={() =>
                    confirmKind === 'accept' ? handleAccept(confirmDeal!) : handleReject(confirmDeal!)
                  }
                  disabled={submitting}
                >
                  {submitting ? 'Working…' : confirmKind === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}