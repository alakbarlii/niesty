'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import DealProgress from '@/components/DealProgress';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

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

  if (loading) return <div className="p-6">Loading deal...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!deal) return <div className="p-6 text-gray-500">Deal not found.</div>;

  const isSender = userId === deal.sender_id;
  const otherUser = isSender ? deal.receiver_info : deal.sender_info;
  const stageName = DEAL_STAGES.includes(deal.deal_stage)
    ? deal.deal_stage
    : 'Unknown Stage';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
            {deal.status === 'accepted' ? (
              <CheckCircle className="text-green-600 w-4 h-4" />
            ) : deal.status === 'pending' ? (
              <Clock className="text-yellow-600 w-4 h-4" />
            ) : (
              <XCircle className="text-red-600 w-4 h-4" />
            )}
            {isSender
              ? `Your offer to ${otherUser?.full_name || 'Someone'}`
              : `${otherUser?.full_name || 'Someone'}'s offer to you`}
          </div>

          <p className="text-xs text-gray-500">
            Sent on: {new Date(deal.created_at).toLocaleString()}
          </p>

          <p className="text-sm text-gray-700">
            <span className="font-semibold">Current Stage:</span> {stageName}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 font-medium mb-1">Description</p>
          <p className="bg-gray-50 p-3 rounded text-gray-800 text-sm">{deal.message}</p>
        </div>

        <DealProgress currentStage={DEAL_STAGES.indexOf(deal.deal_stage)} />
      </div>
    </div>
  );
}
