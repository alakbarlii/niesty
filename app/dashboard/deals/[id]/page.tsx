'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader, MessageSquare } from 'lucide-react';
import DealProgress from '@/components/DealProgress';
import PersonalNotes from '@/components/PersonalNotes';
import DealChat from '@/components/DealChat';

interface Deal {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  deal_stage: string;
  created_at: string;
  sender_info?: { full_name: string; username: string };
  receiver_info?: { full_name: string; username: string };
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

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params?.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchDeal = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        setError('User not found.');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (!data || dealError) {
        setError('Deal not found.');
        setLoading(false);
        return;
      }

      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', [data.sender_id, data.receiver_id]);

      const sender = users?.find((u) => u.id === data.sender_id);
      const receiver = users?.find((u) => u.id === data.receiver_id);

      setDeal({
        ...data,
        sender_info: sender,
        receiver_info: receiver,
      });

      setLoading(false);
    };

    if (dealId) fetchDeal();
  }, [dealId]);

  if (loading)
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400">
        <Loader className="w-4 h-4 animate-spin" /> Loading deal...
      </div>
    );
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!deal) return <div className="p-6 text-gray-400">Deal not found.</div>;

  const isSender = userId === deal.sender_id;
  const otherUser = isSender ? deal.receiver_info : deal.sender_info;
  const currentStageIndex = DEAL_STAGES.indexOf(deal.deal_stage);

  return (
    <div className="p-6 max-w-3xl mx-auto relative">
      <h1 className="text-3xl font-bold mb-6 text-white">Deal Details</h1>

      {/* Main Deal Box */}
      <div className="border border-white/10 bg-white/5 backdrop-blur-lg rounded-2xl p-6 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)] space-y-6">
        <div className="space-y-4 text-sm">
          <div className="bg-white/10 p-4 rounded-xl flex items-center justify-between text-base font-semibold">
            <span>
              {isSender
                ? `Your offer to ${otherUser?.full_name}`
                : `${otherUser?.full_name}'s offer to you`}
            </span>
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-white/60 hover:text-yellow-400 transition"
              aria-label="Open chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>

          <p>
            <span className="font-medium text-white/70">Current Stage:</span>{' '}
            <span className="text-yellow-400 font-semibold">
              {DEAL_STAGES[currentStageIndex] || 'Unknown'}
            </span>
          </p>

          <p>
            <span className="font-medium text-white/70">Sent on:</span>{' '}
            {new Date(deal.created_at).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1 text-white/60">Description</p>
          <p className="bg-white/10 p-4 rounded-xl text-sm text-white/90">
            {deal.message}
          </p>
        </div>

        <DealProgress currentStage={currentStageIndex} />

        {currentStageIndex < DEAL_STAGES.length - 1 ? (
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={async () => {
                const nextStage = DEAL_STAGES[currentStageIndex + 1];
                const { error } = await supabase
                  .from('deals')
                  .update({ deal_stage: nextStage })
                  .eq('id', deal.id);

                if (!error) {
                  setDeal({ ...deal, deal_stage: nextStage });
                } else {
                  alert('Failed to advance stage.');
                }
              }}
              className="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Advance to Next Stage
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-white/10 text-center text-green-400 font-semibold text-sm">
            Deal Completed
          </div>
        )}
      </div>

      {/* Personal Notes */}
      <div className="mt-6">
        <PersonalNotes dealId={deal.id} />
      </div>

      {/* Chat Window */}
      {showChat && userId && (
        <DealChat dealId={deal.id} currentUserId={userId} />
      )}
    </div>
  );
}
