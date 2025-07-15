'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader } from 'lucide-react';
import DealProgress from '@/components/DealProgress';

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
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader className="w-4 h-4 animate-spin" /> Loading deal...
      </div>
    );
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!deal) return <div className="p-6 text-gray-500">Deal not found.</div>;

  const isSender = userId === deal.sender_id;
  const otherUser = isSender ? deal.receiver_info : deal.sender_info;
  const currentStageIndex = DEAL_STAGES.indexOf(deal.deal_stage);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Deal Details</h1>

      <div className="border rounded-xl p-5 bg-gray-900 text-white shadow-sm space-y-6">
        <div className="text-sm space-y-1">
          <div className="bg-gray-800 p-3 rounded text-center text-lg font-semibold text-white">
            {isSender
              ? `Your offer to ${otherUser?.full_name}`
              : `${otherUser?.full_name}'s offer to you`}
          </div>

          <p>
            <span className="font-medium">Current Stage:</span>{' '}
            <span className="text-blue-300 font-semibold">
              {DEAL_STAGES[currentStageIndex] || 'Unknown'}
            </span>
          </p>

          <p>
            <span className="font-medium">Sent on:</span>{' '}
            {new Date(deal.created_at).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1 text-gray-300">Description</p>
          <p className="bg-gray-800 p-3 rounded text-sm text-gray-200">
            {deal.message}
          </p>
        </div>

        <DealProgress currentStage={currentStageIndex} />

        {/* DEV BUTTON FOR ADVANCING STAGE */}
        {currentStageIndex < DEAL_STAGES.length - 1 ? (
          <div className="pt-2 border-t border-gray-800">
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
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
            >
              Advance to Next Stage
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-gray-800 text-center text-green-400 font-semibold text-sm">
            Deal Completed
          </div>
        )}
      </div>
    </div>
  );
}
