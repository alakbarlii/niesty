'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import DealProgress from '@/components/DealProgress';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

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
  const directionText = isSender
    ? `Your offer to ${otherUser?.full_name}`
    : `${otherUser?.full_name}'s offer to you`;

  const statusIcon =
    deal.status === 'accepted' ? (
      <CheckCircle className="text-green-600 w-4 h-4 mr-1 inline" />
    ) : deal.status === 'pending' ? (
      <Clock className="text-yellow-600 w-4 h-4 mr-1 inline" />
    ) : (
      <XCircle className="text-red-600 w-4 h-4 mr-1 inline" />
    );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Deal Details</h1>

      <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-medium text-gray-800">
            {statusIcon} {directionText}
          </p>
          <p>
            <span className="font-medium">Status:</span>{' '}
            <span
              className={`capitalize px-2 py-0.5 text-sm rounded ${
                deal.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : deal.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {deal.status}
            </span>
          </p>
          <p>
            <span className="font-medium">Sent on:</span>{' '}
            {new Date(deal.created_at).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 font-medium mb-1">Description</p>
          <p className="bg-gray-50 p-3 rounded text-gray-800 text-sm">
            {deal.message}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 font-medium mb-1">Deal Progress</p>
          <DealProgress currentStage={DEAL_STAGES.indexOf(deal.deal_stage)} />
        </div>
      </div>
    </div>
  );
}
