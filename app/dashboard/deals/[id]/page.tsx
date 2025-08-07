'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  agreed_by_sender?: boolean;
  agreed_by_receiver?: boolean;
  approved_by_sender?: boolean;
  approved_by_receiver?: boolean;
  submission_url?: string;
  rejection_reason?: string | null;
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

      if (data.status === 'accepted' && data.deal_stage === 'Waiting for Response') {
        await supabase
          .from('deals')
          .update({ deal_stage: 'Negotiating Terms' })
          .eq('id', data.id);
        data.deal_stage = 'Negotiating Terms';
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

  const isSender = userId === deal?.sender_id;
  const isReceiver = userId === deal?.receiver_id;
  const otherUser = isSender ? deal?.receiver_info : deal?.sender_info;
  const currentStageIndex = deal ? DEAL_STAGES.indexOf(deal.deal_stage) : -1;
  const hasApproved = isSender ? deal?.approved_by_sender : deal?.approved_by_receiver;

  const handleAgree = async () => {
    

    const columnToUpdate = isSender ? 'agreed_by_sender' : 'agreed_by_receiver';
    const { error } = await supabase
      .from('deals')
      .update({ [columnToUpdate]: true })
      .eq('id', deal?.id);
    if (error) return alert('Failed to agree to terms.');

    const { data: refreshedDeal } = await supabase
      .from('deals')
      .select('*')
      .eq('id', deal?.id)
      .single();

    const bothAgreed = refreshedDeal?.agreed_by_sender && refreshedDeal?.agreed_by_receiver;
    if (bothAgreed) {
      await supabase
        .from('deals')
        .update({ deal_stage: 'Platform Escrow' })
        .eq('id', deal?.id);
      refreshedDeal.deal_stage = 'Platform Escrow';
    }

    setDeal(refreshedDeal);
  };

  const handleSubmitContent = async (url: string) => {
    

    const { error } = await supabase
      .from('deals')
      .update({ submission_url: url, deal_stage: 'Content Submitted', rejection_reason: null })
      .eq('id', deal?.id);

    if (error) return alert('Failed to submit content.');

    setDeal((prev) =>
      prev && { ...prev, submission_url: url, deal_stage: 'Content Submitted', rejection_reason: null }
    );
  };

  const handleRejectContent = async (reason: string) => {
    

    const { error } = await supabase
      .from('deals')
      .update({ rejection_reason: reason, deal_stage: 'Platform Escrow', submission_url: null })
      .eq('id', deal?.id);

    if (error) return alert('Failed to reject content.');

    const { data: updatedDeal } = await supabase.from('deals').select('*').eq('id', deal?.id).single();
    setDeal(updatedDeal);
  };

  const handleApproval = async () => {
    

    const columnToUpdate = isSender ? 'approved_by_sender' : 'approved_by_receiver';
    const { error } = await supabase.from('deals').update({ [columnToUpdate]: true }).eq('id', deal?.id);
    if (error) return alert('Failed to approve content.');

    const { data: updatedDeal } = await supabase.from('deals').select('*').eq('id', deal?.id).single();
    const bothApproved = updatedDeal?.approved_by_sender && updatedDeal?.approved_by_receiver;

    if (bothApproved) {
      const { error: releaseError } = await supabase
        .from('deals')
        .update({ deal_stage: 'Payment Released' })
        .eq('id', deal?.id);
      if (releaseError) return alert('Failed to release payment.');
      updatedDeal.deal_stage = 'Payment Released';
    }

    setDeal(updatedDeal);
  };

  if (loading)
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400">
        <Loader className="w-4 h-4 animate-spin" /> Loading deal...
      </div>
    );
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!deal) return <div className="p-6 text-gray-400">Deal not found.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto relative">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">Deal Details</h1>

      <div className="bg-white/10 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-base font-semibold text-white mb-4 gap-3 sm:gap-0">
        <span>
          {isSender
            ? `Your offer to ${otherUser?.full_name}`
            : `${otherUser?.full_name}'s offer to you`}
        </span>
        <button
          onClick={() => setShowChat(!showChat)}
          className="text-white/60 hover:text-yellow-400 transition self-start sm:self-auto"
          aria-label="Open chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      <p className="text-white/70 text-sm mb-2">
        <span className="font-medium">Sent on:</span>{' '}
        {new Date(deal.created_at).toLocaleString()}
      </p>

      <p className="text-white text-sm mb-6">
        <span className="font-semibold">Offer:</span> {deal.message}
      </p>

      <div className="border border-white/10 bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-6 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)] space-y-6">
        <DealProgress
          currentStage={currentStageIndex}
          contentLink={deal.submission_url || undefined}
          isEditable={isSender && deal.deal_stage === 'Platform Escrow'}
          isRejected={!!deal.rejection_reason}
          rejectionReason={deal.rejection_reason || undefined}
          onApprove={isReceiver && !hasApproved ? handleApproval : undefined}
          onReject={isReceiver && !hasApproved ? handleRejectContent : undefined}
          onAgree={deal.deal_stage === 'Negotiating Terms' ? handleAgree : undefined}
          onSubmitContent={isSender && deal.deal_stage === 'Platform Escrow' ? handleSubmitContent : undefined}
          canApprove={isReceiver && !hasApproved}
          isSender={isSender}
        />
      </div>

      <div className="mt-6">
        <PersonalNotes dealId={deal.id} />
      </div>

      {showChat && userId && (
        <DealChat
          dealId={deal.id}
          currentUserId={userId}
          otherUser={{
            name: otherUser?.full_name || 'Unknown User',
            avatar: null,
          }}
        />
      )}
    </div>
  );
}
