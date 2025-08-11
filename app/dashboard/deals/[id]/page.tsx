'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader, MessageSquare } from 'lucide-react';
import DealProgress from '@/components/DealProgress';
import DealChat from '@/components/DealChat';

import {
  fetchLatestSubmission,
  submitSubmission,
  approveSubmission,
  rejectSubmission,
  type DealSubmission,
} from '@/lib/supabase/dealSubmissions';

type UserRole = 'creator' | 'business';
type SubmissionStatus = 'pending' | 'rework' | 'approved' | null;

interface ProfileLite {
  id: string;
  full_name: string;
  username: string;
  role?: UserRole;
  profile_url?: string | null;
}

interface Deal {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  deal_stage: (typeof DEAL_STAGES)[number] | string;
  created_at: string;

  // Agreement
  accepted_at?: string | null;
  agreement_terms?: string | null;
  deal_value?: number | null;
  creator_agreed_at?: string | null;
  business_agreed_at?: string | null;

  // Submission / approval (legacy columns kept for compatibility)
  submission_url?: string | null;
  submitted_at?: string | null;
  submission_status?: SubmissionStatus;
  rejection_reason?: string | null;

  approved_at?: string | null;
  payout_requested_at?: string | null;
  payout_status?: 'requested' | 'paid' | null;
  payment_released_at?: string | null;

  // UI helpers
  sender_info?: ProfileLite;
  receiver_info?: ProfileLite;

  // legacy flags
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
] as const;

export default function DealDetailPage() {
  // Robust param normalization (prevents infinite spinner)
  const rawParams = useParams() as Record<string, string | string[] | undefined>;
  const dealId =
    (Array.isArray(rawParams?.id) ? rawParams.id[0] : (rawParams?.id as string | undefined)) ??
    undefined;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<DealSubmission | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<boolean>(false);

  // Agreement draft (shown during Negotiating)
  const [draftAmount, setDraftAmount] = useState<number>(0);
  const [draftTerms, setDraftTerms] = useState<string>('');

  // Content delivery input (big section below)
  const [deliverUrl, setDeliverUrl] = useState<string>('');

  // ========= Load =========
  useEffect(() => {
    const fetchDeal = async () => {
      // Guard: missing id -> stop loading & show error
      if (!dealId) {
        setError('Missing deal id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setError('User not found.');
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
          return;
        }

        if (data.accepted_at && data.deal_stage === 'Waiting for Response') {
          await supabase.from('deals').update({ deal_stage: 'Negotiating Terms' }).eq('id', data.id);
          data.deal_stage = 'Negotiating Terms';
        }

        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, username, role, profile_url')
          .in('id', [data.sender_id, data.receiver_id]);

        const sender = users?.find((u) => u.id === data.sender_id) as ProfileLite | undefined;
        const receiver = users?.find((u) => u.id === data.receiver_id) as ProfileLite | undefined;

        const normalized: Deal = {
          ...data,
          sender_info: sender,
          receiver_info: receiver,
          approved_by_sender: !!data.approved_at,
          approved_by_receiver: !!data.approved_at,
        };

        setDeal(normalized);

        // Load latest submission from deal_submissions (non-fatal)
        try {
          const sub = await fetchLatestSubmission(data.id);
          setLatestSubmission(sub);
        } catch {
          setLatestSubmission(null);
        }

        setDraftAmount(Number(data.deal_value ?? 0));
        setDraftTerms(data.agreement_terms ?? '');
      } catch {
        setError('Failed to load deal.');
      } finally {
        setLoading(false);
      }
    };

    void fetchDeal();
  }, [dealId]);

  const isSender = userId === deal?.sender_id;
  const myProfile: ProfileLite | undefined =
    (isSender ? deal?.sender_info : deal?.receiver_info) || undefined;
  const isCreator = myProfile?.role === 'creator';
  const isBusiness = myProfile?.role === 'business';
  const otherUser = isSender ? deal?.receiver_info : deal?.sender_info;

  // Submission-driven UI values (defined BEFORE stage logic because it uses them)
  const submissionUrl = latestSubmission?.url ?? undefined;
  const submissionStatus: SubmissionStatus =
    (latestSubmission?.status as SubmissionStatus) ?? null;
  const rejectionReason = latestSubmission?.rejection_reason ?? null;

  // Stage display rules:
  // - pending submission: "Content Submitted" is checked, "Approved" shows the clock
  // - rework: "Content Submitted" shows the clock
  // - approved: "Approved" becomes ✅ and current moves to "Payment Released"
  const currentStageIndex = useMemo(() => {
    if (!deal) return 0;

    if (submissionStatus === 'pending') {
      return DEAL_STAGES.indexOf('Approved'); // ⏳ here; "Content Submitted" is ✅
    }
    if (submissionStatus === 'rework') {
      return DEAL_STAGES.indexOf('Content Submitted'); // ⏳ here
    }
    if (submissionStatus === 'approved') {
      // ✅ when approved, move current to "Payment Released" so "Approved" shows as completed
      return DEAL_STAGES.indexOf('Payment Released');
    }

    // Fallback to DB stage when no submission status yet
    const idx = DEAL_STAGES.indexOf(deal.deal_stage as (typeof DEAL_STAGES)[number]);
    return idx >= 0 ? idx : 0;
  }, [deal, submissionStatus]);

  const bothAgreed = !!deal?.creator_agreed_at && !!deal?.business_agreed_at;

  const displayAmount = useMemo(() => {
    if (!deal) return '';
    if (deal.deal_stage === 'Negotiating Terms' && (!deal.deal_value || deal.deal_value <= 0)) {
      return 'Negotiate';
    }
    if (deal.deal_value && deal.deal_value > 0) {
      return `$${Math.round(deal.deal_value).toLocaleString()} USD`;
    }
    return '—';
  }, [deal]);

  const refreshDeal = async (id: string) => {
    try {
      const [{ data: d }, sub] = await Promise.all([
        supabase.from('deals').select('*').eq('id', id).maybeSingle(),
        (async () => {
          try {
            return await fetchLatestSubmission(id);
          } catch {
            return null;
          }
        })(),
      ]);
      if (d) setDeal((prev) => (prev ? { ...prev, ...d } : (d as Deal)));
      setLatestSubmission(sub);
    } catch {
      /* no-op */
    }
  };

  const nowISO = () => new Date().toISOString();

  const handleAcceptOffer = async () => {
    if (!deal) return;
    const { error: err } = await supabase
      .from('deals')
      .update({
        accepted_at: nowISO(),
        deal_stage: 'Negotiating Terms',
        status: 'accepted',
      })
      .eq('id', deal.id);
    if (err) {
      alert(err.message);
      return;
    }
    await refreshDeal(deal.id);
  };

  const handleSaveAgreementDraft = async () => {
    if (!deal) return;
    if (!draftAmount || draftAmount <= 0) {
      alert('Enter a valid amount.');
      return;
    }

    const { error: err } = await supabase
      .from('deals')
      .update({
        agreement_terms: draftTerms,
        deal_value: draftAmount,
      })
      .eq('id', deal.id);

    if (err) {
      alert(err.message);
      return;
    }
    setDeal((prev) =>
      prev ? { ...prev, agreement_terms: draftTerms, deal_value: draftAmount } : prev
    );
    alert('Draft saved.');
  };

  const handleConfirmAgreement = async () => {
    if (!deal || !userId) return;
    const myRole = myProfile?.role;
    const col = myRole === 'creator' ? 'creator_agreed_at' : 'business_agreed_at';

    const { error: err } = await supabase
      .from('deals')
      .update({ [col]: nowISO() })
      .eq('id', deal.id);
    if (err) {
      alert(err.message);
      return;
    }

    const { data: refreshed } = await supabase
      .from('deals')
      .select('id,creator_agreed_at,business_agreed_at,deal_value,agreement_terms,deal_stage')
      .eq('id', deal.id)
      .maybeSingle();

    const both = !!refreshed?.creator_agreed_at && !!refreshed?.business_agreed_at;

    setDeal((prev) =>
      prev
        ? {
            ...prev,
            creator_agreed_at: refreshed?.creator_agreed_at ?? prev.creator_agreed_at,
            business_agreed_at: refreshed?.business_agreed_at ?? prev.business_agreed_at,
            deal_value: refreshed?.deal_value ?? prev.deal_value,
            agreement_terms: refreshed?.agreement_terms ?? prev.agreement_terms,
            deal_stage: both ? 'Platform Escrow' : prev.deal_stage,
          }
        : prev
    );
  };

  /* ===================== SUBMISSION FLOW (deal_submissions) ===================== */

  // CREATOR-ONLY submit content
  const handleSubmitContent = async (url: string) => {
    if (!deal || !isCreator || !userId) return;
    try {
      await submitSubmission(deal.id, url, userId);
      setDeliverUrl('');
      await refreshDeal(deal.id);
    } catch {
      alert('Failed to submit content.');
    }
  };

  // BUSINESS-ONLY reject
  const handleRejectContent = async (reason: string) => {
    if (!deal || !isBusiness || !latestSubmission) return;
    try {
      await rejectSubmission(latestSubmission.id, deal.id, reason);
      await refreshDeal(deal.id);
    } catch {
      alert('Failed to reject content.');
    }
  };

  // BUSINESS-ONLY approve
  const handleApproval = async () => {
    if (!deal || !isBusiness || !latestSubmission) return;
    try {
      await approveSubmission(latestSubmission.id, deal.id);
      await refreshDeal(deal.id);
    } catch {
      alert('Failed to approve content.');
    }
  };

  // ========= Render =========
  if (loading)
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400">
        <Loader className="w-4 h-4 animate-spin" /> Loading deal...
      </div>
    );
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!deal) return <div className="p-6 text-gray-400">Deal not found.</div>;

  // Avatar (string | null)
  const otherAvatar: string | null =
    (otherUser?.profile_url ?? null) ||
    (otherUser?.username
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          otherUser.username
        )}`
      : null);

  // Helpers for the big Content Delivery section
  const isValidHttpUrl = (url: string): boolean => /^https?:\/\/\S+/i.test(url);
  const latestIsRework = submissionStatus === 'rework';
  const creatorCanSubmit =
    !!isCreator &&
    (deal.deal_stage === 'Platform Escrow' || deal.deal_stage === 'Content Submitted') &&
    (latestIsRework || !submissionUrl);

  const businessCanReview = !!isBusiness && submissionStatus === 'pending';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Deal Details</h1>
        <button
          onClick={() => setShowChat((v) => !v)}
          className="self-start sm:self-auto inline-flex items-center gap-2 text-white/70 hover:text-yellow-400 transition"
          aria-label="Open chat"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">Chat</span>
        </button>
      </div>

      {/* Meta */}
      <div className="bg-white/10 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-sm sm:text-base font-semibold text-white mb-4 gap-3 sm:gap-0">
        <span className="leading-tight">
          {isSender
            ? `Your offer to ${otherUser?.full_name ?? '—'}`
            : `${otherUser?.full_name ?? '—'}'s offer to you`}
        </span>
        <span className="text-xs sm:text-sm font-medium text-white/70">
          Sent: {new Date(deal.created_at).toLocaleString()}
        </span>
      </div>

      {/* Main: Progress (left) • Agreement (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* LEFT: Progress & actions */}
        <div className="space-y-4">
          <div className="border border-white/10 bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-5 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <p className="text-white text-sm sm:text-base mb-3">
              <span className="font-semibold">Offer:</span> {deal.message}
            </p>

            {!deal.accepted_at &&
              deal.deal_stage === 'Waiting for Response' &&
              !isSender && (
                <div className="mb-4 p-3 sm:p-4 rounded-2xl border border-white/10 bg-black/30 text-white">
                  <p className="font-semibold mb-2 text-sm sm:text-base">
                    Accept the offer to start negotiating terms
                  </p>
                  <button
                    onClick={handleAcceptOffer}
                    className="px-4 py-2 bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-600 text-sm"
                  >
                    Accept Offer
                  </button>
                </div>
              )}

            <DealProgress
              currentStage={currentStageIndex}
              contentLink={submissionUrl}
              isEditable={false}
              isRejected={submissionStatus === 'rework'}
              rejectionReason={rejectionReason}
              // No approve/reject inside the timeline
              onApprove={undefined}
              onReject={undefined}
              onAgree={
                deal.deal_stage === 'Negotiating Terms' ? handleConfirmAgreement : undefined
              }
              // No inline submission inside the timeline
              onSubmitContent={undefined}
              canApprove={false}
              isCreator={!!isCreator}
              isSender={!!isSender}
              submissionStatus={submissionStatus}
            />
          </div>
        </div>

        {/* RIGHT: Agreement card */}
        <div className="space-y-4">
          {deal.deal_stage === 'Negotiating Terms' && !bothAgreed && (
            <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-black/30 text-white">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <p className="font-semibold text-base sm:text-lg">Deal Agreement</p>
                <span className="text-xs sm:text-sm text-white/70">
                  Amount:&nbsp;<span className="font-semibold">{displayAmount}</span>
                </span>
              </div>

              <div className="flex items-end gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={Number.isFinite(draftAmount) ? draftAmount : 0}
                    onChange={(e) => setDraftAmount(Number(e.target.value))}
                    className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
                    placeholder="Enter agreed amount"
                  />
                </div>
                <button
                  className="px-3 py-2 bg-gray-700 rounded text-sm"
                  onClick={handleSaveAgreementDraft}
                >
                  Save Draft
                </button>
              </div>

              <label className="block text-xs text-gray-400 mb-1">Terms</label>
              <textarea
                value={draftTerms}
                onChange={(e) => setDraftTerms(e.target.value)}
                placeholder="Deliverables, dates, rights, posting schedule..."
                className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
                rows={4}
              />

              <div className="flex items-center gap-2 mt-3">
                <button
                  className="px-4 py-2 bg-emerald-600 rounded text-white text-sm sm:text-base"
                  onClick={handleConfirmAgreement}
                >
                  Confirm Agreement
                </button>
                <p className="text-xs text-gray-400">
                  When both sides confirm, the deal moves to escrow.
                </p>
              </div>

              <div className="mt-2 text-[11px] sm:text-xs text-gray-400">
                Creator: {deal.creator_agreed_at ? '✔ confirmed' : '— pending'} ·{' '}
                Business: {deal.business_agreed_at ? '✔ confirmed' : '— pending'}
              </div>
            </div>
          )}

          {bothAgreed && (
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-700/40 bg-emerald-900/20 text-white">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-emerald-300 font-semibold text-base sm:text-lg">
                  Agreement Locked
                </p>
                <span className="text-xs sm:text-sm">
                  Amount:&nbsp;
                  <span className="font-semibold">
                    {deal.deal_value && deal.deal_value > 0
                      ? `$${Math.round(deal.deal_value).toLocaleString()} USD`
                      : '—'}
                  </span>
                </span>
              </div>
              <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">
                {deal.agreement_terms || '—'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ======= BIG CONTENT DELIVERY SECTION (below) ======= */}
      <div className="mt-6 border border-white/10 bg-black/40 rounded-2xl p-4 sm:p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold">Content Delivery</h2>
          <span className="text-xs text-white/60">
            Stage: <span className="font-semibold">{deal.deal_stage}</span>
          </span>
        </div>

        {/* Status / latest link */}
        <div className="text-sm mb-3">
          {submissionUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-white/70">Latest submission:</span>
              <a
                href={submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline break-all"
              >
                {submissionUrl}
              </a>
            </div>
          ) : (
            <span className="text-white/60">No submission yet.</span>
          )}
          {rejectionReason && (
            <div className="mt-2 text-red-400 text-sm">
              <span className="font-semibold">Rework requested:</span> {rejectionReason}
            </div>
          )}
        </div>

        {/* Creator: Submit / Resubmit */}
        {creatorCanSubmit && (
          <div className="mt-3">
            <label className="block text-xs text-white/60 mb-1">Content URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://your-content-url.com"
                value={deliverUrl}
                onChange={(e) => setDeliverUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const url = deliverUrl.trim();
                    if (!isValidHttpUrl(url)) {
                      alert('Enter a valid URL starting with http:// or https://');
                      return;
                    }
                    void handleSubmitContent(url);
                  }
                }}
                className="flex-1 text-sm p-2 rounded bg-gray-900 border border-white/10 text-white"
                aria-label="Content URL"
              />
              <button
                onClick={() => {
                  const url = deliverUrl.trim();
                  if (!isValidHttpUrl(url)) {
                    alert('Enter a valid URL starting with http:// or https://');
                    return;
                  }
                  void handleSubmitContent(url);
                }}
                className="px-4 py-2 bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-600 text-sm"
              >
                {latestIsRework ? 'Resubmit' : 'Submit'}
              </button>
            </div>
            <p className="text-xs text-white/50 mt-2">
              {latestIsRework
                ? 'Your previous submission was rejected. Update and resubmit the correct link.'
                : 'Submit the final link to your content for review.'}
            </p>
          </div>
        )}

        {/* Business: Approve / Reject */}
        {businessCanReview && submissionUrl && (
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <button
                onClick={() => void handleApproval()}
                className="px-4 py-2 bg-emerald-500 text-black rounded font-semibold hover:bg-emerald-600 text-sm"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Reason for rejection:')?.trim();
                  if (!reason) return;
                  void handleRejectContent(reason);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 text-sm"
              >
                Reject
              </button>
            </div>
            <p className="text-xs text-white/50 mt-2">
              Approval will move the deal to <span className="font-semibold">Approved</span>.
              Rejection sends it back to <span className="font-semibold">Content Submitted</span>{' '}
              with your reason.
            </p>
          </div>
        )}
      </div>

      {/* Chat */}
      {showChat && userId && (
        <div className="mt-6">
          <DealChat
            dealId={deal.id}
            currentUserId={userId}
            otherUser={{
              name: otherUser?.full_name || 'Unknown User',
              profile_url: otherAvatar,
            }}
          />
        </div>
      )}
    </div>
  );
}
