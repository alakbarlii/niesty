'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader, MessageSquare } from 'lucide-react';
import DealProgress from '@/components/DealProgress';
import PersonalNotes from '@/components/PersonalNotes';
import DealChat from '@/components/DealChat';
import {
  acceptDeal,
  saveAgreementDraft,
  confirmAgreement,
} from '@/lib/supabase/deals';

interface ProfileLite {
  id: string;
  full_name: string;
  username: string;
}

interface Deal {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  deal_stage: string;
  created_at: string;

  // Agreement
  accepted_at?: string | null;
  agreement_terms?: string | null;
  deal_value?: number | null;
  creator_agreed_at?: string | null;
  business_agreed_at?: string | null;

  // Submission / approval
  submission_url?: string | null;
  submitted_at?: string | null;
  submission_status?: 'pending' | 'rework' | 'approved' | null;
  rejection_reason?: string | null;

  approved_at?: string | null;
  payout_requested_at?: string | null;
  payout_status?: 'requested' | 'paid' | null;
  payment_released_at?: string | null;

  // UI helpers
  sender_info?: ProfileLite;
  receiver_info?: ProfileLite;

  // legacy flags some components referenced; we keep for compatibility
  approved_by_sender?: boolean;
  approved_by_receiver?: boolean;
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

  // Agreement draft (shown during Negotiating)
  const [draftAmount, setDraftAmount] = useState<number>(0);
  const [draftTerms, setDraftTerms] = useState<string>('');

  useEffect(() => {
    const fetchDeal = async () => {
      setLoading(true);

      // auth
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

      // deal
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

      // Normalize stage if already accepted
      if (data.accepted_at && data.deal_stage === 'Waiting for Response') {
        await supabase.from('deals').update({ deal_stage: 'Negotiating Terms' }).eq('id', data.id);
        data.deal_stage = 'Negotiating Terms';
      }

      // fetch names
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', [data.sender_id, data.receiver_id]);

      const sender = users?.find((u) => u.id === data.sender_id) as ProfileLite | undefined;
      const receiver = users?.find((u) => u.id === data.receiver_id) as ProfileLite | undefined;

      const approved_by_sender = !!data.approved_at;
      const approved_by_receiver = !!data.approved_at;

      const normalized: Deal = {
        ...data,
        sender_info: sender,
        receiver_info: receiver,
        approved_by_sender,
        approved_by_receiver,
      };

      setDeal(normalized);

      // seed agreement draft fields
      setDraftAmount(Number(data.deal_value ?? 0));
      setDraftTerms(data.agreement_terms ?? '');

      setLoading(false);
    };

    if (dealId) fetchDeal();
  }, [dealId]);

  const isSender = userId === deal?.sender_id;
  const isReceiver = userId === deal?.receiver_id;
  const otherUser = isSender ? deal?.receiver_info : deal?.sender_info;
  const currentStageIndex = deal ? DEAL_STAGES.indexOf(deal.deal_stage) : -1;
  const hasApproved = isSender ? deal?.approved_by_sender : deal?.approved_by_receiver;
  const bothAgreed = !!deal?.creator_agreed_at && !!deal?.business_agreed_at;

  // ========== Actions ==========

  const handleAcceptOffer = async () => {
    if (!deal) return;
    const { error } = await acceptDeal(deal.id);
    if (error) return alert(error.message);

    // Refresh
    const { data: refreshed } = await supabase.from('deals').select('*').eq('id', deal.id).maybeSingle();
    if (refreshed) {
      setDeal((prev) => (prev ? { ...prev, ...refreshed, deal_stage: 'Negotiating Terms' } : prev));
    }
  };

  const handleSaveAgreementDraft = async () => {
    if (!deal) return;
    if (!draftAmount || draftAmount <= 0) return alert('Enter a valid amount.');
    const { error } = await saveAgreementDraft(deal.id, { terms: draftTerms, amount: draftAmount });
    if (error) return alert(error.message);
    alert('Draft saved.');
    setDeal((prev) => (prev ? { ...prev, agreement_terms: draftTerms, deal_value: draftAmount } : prev));
  };

  const handleConfirmAgreement = async () => {
    if (!deal) return;
    const { error } = await confirmAgreement(deal.id);
    if (error) return alert(error.message);

    // Pull fresh to check if both sides are done; then advance stage locally
    const { data: refreshed } = await supabase
      .from('deals')
      .select('id,creator_agreed_at,business_agreed_at,deal_stage')
      .eq('id', deal.id)
      .maybeSingle();

    const both = !!refreshed?.creator_agreed_at && !!refreshed?.business_agreed_at;

    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        creator_agreed_at: refreshed?.creator_agreed_at ?? prev.creator_agreed_at,
        business_agreed_at: refreshed?.business_agreed_at ?? prev.business_agreed_at,
        deal_stage: both ? 'Platform Escrow' : prev.deal_stage,
      };
    });
  };

  const handleSubmitContent = async (url: string) => {
    if (!deal) return;

    const { error } = await supabase
      .from('deals')
      .update({
        submission_url: url,
        submitted_at: new Date().toISOString(),
        submission_status: 'pending',
        deal_stage: 'Content Submitted',
        rejection_reason: null,
      })
      .eq('id', deal.id);

    if (error) return alert('Failed to submit content.');

    setDeal((prev) =>
      prev
        ? {
            ...prev,
            submission_url: url,
            submitted_at: new Date().toISOString(),
            submission_status: 'pending',
            rejection_reason: null,
            deal_stage: 'Content Submitted',
          }
        : prev
    );
  };

  const handleRejectContent = async (reason: string) => {
    if (!deal) return;

    const { error } = await supabase
      .from('deals')
      .update({
        submission_status: 'rework',
        rejection_reason: reason,
        deal_stage: 'Platform Escrow',
        submission_url: null,
      })
      .eq('id', deal.id);

    if (error) return alert('Failed to reject content.');

    const { data: updatedDeal } = await supabase.from('deals').select('*').eq('id', deal.id).single();
    setDeal(updatedDeal as Deal);
  };

  const handleApproval = async () => {
    if (!deal) return;

    // For MVP, single approval moves to Approved; payout handled elsewhere.
    const { error } = await supabase
      .from('deals')
      .update({ approved_at: new Date().toISOString(), deal_stage: 'Approved', submission_status: 'approved' })
      .eq('id', deal.id);

    if (error) return alert('Failed to approve content.');

    const { data: updatedDeal } = await supabase.from('deals').select('*').eq('id', deal.id).single();
    setDeal(updatedDeal as Deal);
  };

  // ========== Render ==========

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

      {/* Waiting → receiver accepts the offer to start negotiating */}
      {!deal.accepted_at && deal.deal_stage === 'Waiting for Response' && isReceiver && (
        <div className="mb-4 p-4 rounded-xl border border-white/10 bg-black/30 text-white">
          <p className="font-semibold mb-2">Accept the offer to start negotiating terms</p>
          <button
            onClick={handleAcceptOffer}
            className="px-4 py-2 bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-600"
          >
            Accept Offer
          </button>
        </div>
      )}

      {/* Negotiating → show Agreement editor until both confirm */}
      {deal.accepted_at && !bothAgreed && deal.deal_stage === 'Negotiating Terms' && (
        <div className="mb-4 p-4 rounded-xl border border-white/10 bg-black/30 text-white">
          <p className="font-semibold mb-3">Deal Agreement</p>

          <div className="flex gap-3 mb-3">
            <input
              type="number"
              min={1}
              step="1"
              value={draftAmount}
              onChange={(e) => setDraftAmount(Number(e.target.value))}
              className="w-40 bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
              placeholder="Amount (USD)"
            />
            <button
              className="px-3 py-2 bg-gray-700 rounded text-sm"
              onClick={handleSaveAgreementDraft}
            >
              Save Draft
            </button>
          </div>

          <textarea
            value={draftTerms}
            onChange={(e) => setDraftTerms(e.target.value)}
            placeholder="Deliverables, dates, rights, posting schedule..."
            className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
            rows={4}
          />

          <div className="flex items-center gap-2 mt-3">
            <button
              className="px-4 py-2 bg-emerald-600 rounded text-white"
              onClick={handleConfirmAgreement}
            >
              Confirm Agreement
            </button>
            <p className="text-xs text-gray-400">
              When both sides confirm, the deal moves to escrow.
            </p>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Creator: {deal.creator_agreed_at ? '✔ confirmed' : '— pending'} ·{' '}
            Business: {deal.business_agreed_at ? '✔ confirmed' : '— pending'}
          </div>
        </div>
      )}

      {/* Agreement locked summary */}
      {bothAgreed && (
        <div className="mb-4 p-4 rounded-xl border border-emerald-700/40 bg-emerald-900/20 text-white">
          <p className="text-emerald-300 font-semibold mb-1">Agreement Locked</p>
          <p className="text-sm text-gray-200">Amount: ${deal.deal_value ?? 0} USD</p>
          <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">
            {deal.agreement_terms || '—'}
          </p>
        </div>
      )}

      <div className="border border-white/10 bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-6 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)] space-y-6">
        <DealProgress
          currentStage={currentStageIndex}
          contentLink={deal.submission_url || undefined}
          isEditable={isSender && deal.deal_stage === 'Platform Escrow'}
          isRejected={!!deal.rejection_reason}
          rejectionReason={deal.rejection_reason || undefined}
          onApprove={isReceiver && !hasApproved ? handleApproval : undefined}
          onReject={isReceiver && !hasApproved ? handleRejectContent : undefined}
          onAgree={deal.deal_stage === 'Negotiating Terms' ? handleConfirmAgreement : undefined}
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
