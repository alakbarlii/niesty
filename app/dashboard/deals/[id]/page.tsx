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

// Match-terms helpers
import AgreementMatchCard from '@/components/AgreementMatchCard';
import { fetchLatestPair, proposalsMatch } from '@/lib/supabase/terms';

type UserRole = 'creator' | 'business';
type SubmissionStatus = 'pending' | 'rework' | 'approved' | null;

interface ProfileLite {
  id: string;
  full_name: string;
  username: string;
  role?: UserRole;
  profile_url?: string | null;
}

const DEAL_STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
] as const;

type DealStage = (typeof DEAL_STAGES)[number];

interface Deal {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  deal_stage: DealStage | string;
  created_at: string;

  // Pricing / agreement
  offer_pricing_mode?: 'fixed' | 'negotiable' | null;
  offer_currency?: string | null;
  deal_value?: number | null;
  agreement_terms?: string | null;

  // Agreement confirmations
  accepted_at?: string | null;
  creator_agreed_at?: string | null;
  business_agreed_at?: string | null;

  // Submission / approval
  submission_url?: string | null; // legacy
  submitted_at?: string | null;   // legacy
  submission_status?: SubmissionStatus;
  rejection_reason?: string | null;

  approved_at?: string | null;

  // Payout markers
  payout_requested_at?: string | null;
  payout_status?: 'requested' | 'paid' | null;
  payment_released_at?: string | null;

  // Rejected flags (any one may exist depending on schema)
  rejected_at?: string | null;
  is_rejected?: boolean | null;
  status?: string | null; // e.g. 'rejected'

  // UI helpers
  sender_info?: ProfileLite;
  receiver_info?: ProfileLite;
}

type AgreementTerms = {
  scope?: string;
  deadline?: string; // yyyy-mm-dd or ISO datetime
};

function parseAgreement(terms?: string | null): AgreementTerms {
  if (!terms) return {};
  try {
    const obj = JSON.parse(terms);
    if (obj && typeof obj === 'object') return obj as AgreementTerms;
    return {};
  } catch {
    return { scope: terms };
  }
}

function buildAgreement(ag: AgreementTerms): string {
  return JSON.stringify(ag);
}

export default function DealDetailPage() {
  // ===== Params =====
  const rawParams = useParams() as Record<string, string | string[] | undefined>;
  const dealId =
    (Array.isArray(rawParams?.id) ? rawParams.id[0] : (rawParams?.id as string | undefined)) ??
    undefined;

  // ===== State =====
  const [deal, setDeal] = useState<Deal | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<DealSubmission | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [agreeChecked, setAgreeChecked] = useState<boolean>(false);

  // Content delivery input
  const [deliverUrl, setDeliverUrl] = useState<string>('');

  // ===== Load =====
  useEffect(() => {
    const fetchDeal = async () => {
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
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const { data, error: dealErr } = await supabase
          .from('deals')
          .select('*')
          .eq('id', dealId)
          .single();

        if (!data || dealErr) {
          setError('Deal not found.');
          setLoading(false);
          return;
        }

        // Determine "rejected" early to avoid any auto-advance
        const rejected =
          data.is_rejected === true ||
          !!data.rejected_at ||
          data.status === 'rejected' ||
          data.deal_stage === 'Rejected';

        // Auto-advance to Negotiating on accept (only if NOT rejected)
        if (!rejected && data.accepted_at && data.deal_stage === 'Waiting for Response') {
          await supabase.from('deals').update({ deal_stage: 'Negotiating Terms' }).eq('id', data.id);
          data.deal_stage = 'Negotiating Terms';
        }

        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, username, role, profile_url')
          .in('id', [data.sender_id, data.receiver_id]);

        const sender = (users || []).find((u) => u.id === data.sender_id) as ProfileLite | undefined;
        const receiver = (users || []).find((u) => u.id === data.receiver_id) as ProfileLite | undefined;

        const normalized: Deal = {
          ...data,
          sender_info: sender,
          receiver_info: receiver,
        };
        setDeal(normalized);

        // Load latest submission (non-fatal)
        try {
          const sub = await fetchLatestSubmission(data.id);
          setLatestSubmission(sub);
        } catch {
          setLatestSubmission(null);
        }
      } catch {
        setError('Failed to load deal.');
      } finally {
        setLoading(false);
      }
    };

    void fetchDeal();
  }, [dealId]);

  // ===== Derived =====
  const isSender = userId === deal?.sender_id;
  const myProfile: ProfileLite | undefined =
    (isSender ? deal?.sender_info : deal?.receiver_info) || undefined;
  const isCreator = myProfile?.role === 'creator';
  const isBusiness = myProfile?.role === 'business';
  const otherUser = isSender ? deal?.receiver_info : deal?.sender_info;

  const submissionUrl = latestSubmission?.url ?? undefined;
  const submissionStatus: SubmissionStatus =
    (latestSubmission?.status as SubmissionStatus) ?? null;
  const rejectionReason = latestSubmission?.rejection_reason ?? null;

  // Was the INITIAL offer rejected?
  const isDealRejected =
    !!deal &&
    (deal.is_rejected === true ||
      !!deal.rejected_at ||
      deal.status === 'rejected' ||
      deal.deal_stage === 'Rejected');

  // Payment progress detection (for the yellow hint in Content Delivery)
  const payoutInFlight = !!deal?.approved_at && !deal?.payment_released_at;

  // Stage index rules (only used for non-rejected deals)
  const currentStageIndex = useMemo(() => {
    if (!deal) return 0;

    if (deal.payment_released_at) {
      return DEAL_STAGES.indexOf('Payment Released');
    }

    if (submissionStatus === 'approved' && !deal.payment_released_at) {
      return DEAL_STAGES.indexOf('Payment Released');
    }

    if (submissionStatus === 'pending') {
      return DEAL_STAGES.indexOf('Approved'); // clock at Approved
    }

    if (submissionStatus === 'rework') {
      return DEAL_STAGES.indexOf('Content Submitted'); // clock at Content Submitted
    }

    // Fallback to DB stage
    const idx = DEAL_STAGES.indexOf(deal.deal_stage as DealStage);
    return idx >= 0 ? idx : 0;
  }, [deal, submissionStatus]);

  // For DealProgress
  const timelineSubmissionStatus: SubmissionStatus =
    deal?.payment_released_at ? null : submissionStatus;

  const bothAgreed = !!deal?.creator_agreed_at && !!deal?.business_agreed_at;

  // ===== Price label shown to the right of "Deal Progress"
  const priceLabel = useMemo(() => {
    if (!deal) return '—';
    const val = deal.deal_value ?? null;

    // If fixed offer had an amount, show it from the start
    if (deal.offer_pricing_mode === 'fixed' && val && val > 0) {
      return `$${Math.round(val).toLocaleString()} USD`;
    }

    // If a number exists (e.g., saved during negotiating), show it
    if (val && val > 0) return `$${Math.round(val).toLocaleString()} USD`;

    // Otherwise “Negotiate”
    return 'Negotiate';
  }, [deal]);

  const agreementFromDb = useMemo(
    () => parseAgreement(deal?.agreement_terms),
    [deal?.agreement_terms]
  );

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

  // ===== Actions (blocked when rejected) =====
  const handleAcceptOffer = async () => {
    if (!deal) return;
    if (isDealRejected) {
      alert('This offer was rejected and cannot be accepted.');
      return;
    }
    const { error: err } = await supabase
      .from('deals')
      .update({
        accepted_at: nowISO(),
        deal_stage: 'Negotiating Terms',
      })
      .eq('id', deal.id);
    if (err) {
      alert(err.message);
      return;
    }
    await refreshDeal(deal.id);
  };

  const handleConfirmAgreement = async () => {
    if (!deal || !userId) return;
    if (isDealRejected) {
      alert('This deal was rejected and cannot be confirmed.');
      return;
    }

    if (!agreeChecked) {
      alert('Please check the agreement box.');
      return;
    }

    // 1) ensure both proposals match (same amount + date)
    let matchedAmount: number | null = null;
    let matchedDeadline: string | null = null;
    try {
      const pair = await fetchLatestPair(deal.id, deal.sender_id, deal.receiver_id);
      const ok = proposalsMatch(pair.sender, pair.receiver);
      if (!ok) {
        alert('Both sides must propose the SAME amount and delivery date before confirming.');
        return;
      }
      const sample = pair.sender ?? pair.receiver!;
      matchedAmount = Number(sample.amount);
      matchedDeadline = String(sample.deadline).slice(0, 10);
    } catch {
      alert('Could not verify matching terms. Try again.');
      return;
    }

    // 2) Stamp my role's agreement
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

    // 3) Persist matched terms onto the deal (so locked view shows the numbers)
    const agreementJson = buildAgreement({
      scope: agreementFromDb.scope || '',
      deadline: matchedDeadline || undefined,
    });

    await supabase
      .from('deals')
      .update({
        deal_value: matchedAmount!,
        agreement_terms: agreementJson,
      })
      .eq('id', deal.id);

    // 4) If both sides agreed → move to Platform Escrow
    const { data: refreshed } = await supabase
      .from('deals')
      .select('id,creator_agreed_at,business_agreed_at,deal_stage')
      .eq('id', deal.id)
      .maybeSingle();

    const both = !!refreshed?.creator_agreed_at && !!refreshed?.business_agreed_at;

    if (both) {
      await supabase
        .from('deals')
        .update({ deal_stage: 'Platform Escrow' })
        .eq('id', deal.id);
    }

    await refreshDeal(deal.id);
    setAgreeChecked(false);
  };

  // Submission (creator)
  const handleSubmitContent = async (url: string) => {
    if (!deal || !isCreator || !userId) return;
    if (isDealRejected) {
      alert('This deal was rejected. You cannot submit content.');
      return;
    }
    try {
      await submitSubmission(deal.id, url, userId);
      setDeliverUrl('');
      await refreshDeal(deal.id);
    } catch {
      alert('Failed to submit content.');
    }
  };

  // Business reject (with reason)
  const handleRejectContent = async (reason: string) => {
    if (!deal || !isBusiness || !latestSubmission) return;
    if (isDealRejected) {
      alert('This deal was rejected already.');
      return;
    }
    try {
      await rejectSubmission(latestSubmission.id, deal.id, reason);
      await refreshDeal(deal.id);
    } catch {
      alert('Failed to reject content.');
    }
  };

  // Business approve
  const handleApproval = async () => {
    if (!deal || !isBusiness || !latestSubmission) return;
    if (isDealRejected) {
      alert('This deal was rejected already.');
      return;
    }
    try {
      await approveSubmission(latestSubmission.id, deal.id);
      await refreshDeal(deal.id);
    } catch {
      alert('Failed to approve content.');
    }
  };

  // ===== For DealProgress: per-stage timestamps =====
  const stageTimes = useMemo<Record<DealStage, string | null>>(() => {
    // Provide all keys explicitly to satisfy strict typing
    if (!deal) {
      return {
        'Waiting for Response': null,
        'Negotiating Terms': null,
        'Platform Escrow': null,
        'Content Submitted': null,
        'Approved': null,
        'Payment Released': null,
      };
    }

    // Safely read created_at from latestSubmission (fallback to legacy deal.submitted_at)
    const latestSubmittedAt: string | null =
      ((latestSubmission as unknown as { created_at?: string | null } | null)?.created_at ??
        deal.submitted_at ??
        null);

    // When both have agreed, take the later timestamp
    const bothAgreedAt: string | null =
      deal.creator_agreed_at && deal.business_agreed_at
        ? (new Date(deal.creator_agreed_at) > new Date(deal.business_agreed_at)
            ? deal.creator_agreed_at
            : deal.business_agreed_at)
        : null;

    return {
      'Waiting for Response': deal.created_at ?? null,
      'Negotiating Terms': deal.accepted_at ?? null,
      'Platform Escrow': bothAgreedAt,
      'Content Submitted': latestSubmittedAt,
      'Approved': deal.approved_at ?? null,
      'Payment Released': deal.payment_released_at ?? null,
    };
  }, [deal, latestSubmission]);

  // ===== Render =====
  if (loading)
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400">
        <Loader className="w-4 h-4 animate-spin" /> Loading deal...
      </div>
    );
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!deal) return <div className="p-6 text-gray-400">Deal not found.</div>;

  // Avatar
  const otherAvatar: string | null =
    (otherUser?.profile_url ?? null) ||
    (otherUser?.username
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          otherUser.username
        )}`
      : null);

  // Helpers
  const isValidHttpUrl = (url: string): boolean => /^https?:\/\/\S+/i.test(url);
  const latestIsRework = submissionStatus === 'rework';
  const creatorCanSubmit =
    !isDealRejected &&
    !!isCreator &&
    (deal.deal_stage === 'Platform Escrow' || deal.deal_stage === 'Content Submitted') &&
    (latestIsRework || !submissionUrl);

  const businessCanReview = !isDealRejected && !!isBusiness && submissionStatus === 'pending';

  // Deadlines display
  const agreement = agreementFromDb;
  const lockedDeadline =
    agreement.deadline ? new Date(agreement.deadline).toLocaleDateString() : '—';

  // Reusable instructions + responsibilities block — shown in both Negotiating and Locked states
  const AgreementGuidelines = (
    <>
      {/* Title + instructions */}
      <div className="mb-3">
        <p className="font-semibold text-base sm:text-lg">Deal Agreement</p>
        <p className="text-xs text-white/70 mt-1">
          <b>Step 1:</b> Align in chat. <b>Both sides must confirm the same price and delivery date.</b>{' '}
          Once saved and both parties check the box and confirm, the deal moves to <i>Platform Escrow</i>.
        </p>
      </div>

      {/* Role responsibilities (always visible) */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold mb-1">Business will:</p>
          <ul className="text-xs text-white/80 list-disc ml-4 space-y-0.5">
            <li>Deposit the agreed amount into secure escrow.</li>
            <li>Review within 72 hours of submission.</li>
            <li>Approve or request revisions only by agreed scope.</li>
          </ul>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold mb-1">Creator will:</p>
          <ul className="text-xs text-white/80 list-disc ml-4 space-y-0.5">
            <li>Deliver by the agreed deadline.</li>
            <li>Provide original, compliant content.</li>
            <li>Handle up to limited in-scope revisions if requested.</li>
          </ul>
        </div>
      </div>
    </>
  );

  // Simple frozen (all gray) timeline for rejected deals
  const FrozenTimeline = () => (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-300">
        Deal Progress <span className="text-white/60">• {priceLabel}</span>
      </h2>
      <ol className="relative border-l border-gray-700 ml-3">
        {DEAL_STAGES.map((label) => (
          <li key={label} className="mb-6 ml-4">
            <div className="absolute w-3 h-3 rounded-full -left-1.5 border border-gray-500 flex items-center justify-center bg-gray-900">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

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

      {/* Rejected banner */}
      {isDealRejected && (
        <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-900/20 text-red-200 text-sm">
          This offer was <b>rejected</b>. It can’t be accepted or progressed.
        </div>
      )}

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

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* LEFT: Progress */}
        <div className="space-y-4">
          <div className="border border-white/10 bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-5 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm sm:text-base">
                <span className="font-semibold">Offer:</span> {deal.message}
              </p>
              <p className="text-xs sm:text-sm text-white/70">
                {priceLabel}
              </p>
            </div>

            {/* Accept (receiver only) — hidden if rejected */}
            {!isDealRejected &&
              !deal.accepted_at &&
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

            {/* Timeline */}
            {isDealRejected ? (
              <FrozenTimeline />
            ) : (
              <DealProgress
                currentStage={currentStageIndex}
                contentLink={submissionUrl}
                isEditable={false}
                isRejected={submissionStatus === 'rework'}
                rejectionReason={rejectionReason}
                onApprove={undefined}
                onReject={undefined}
                onAgree={undefined}
                onSubmitContent={undefined}
                canApprove={false}
                isCreator={!!isCreator}
                isSender={!!isSender}
                submissionStatus={timelineSubmissionStatus}
                stageTimes={stageTimes}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Agreement Card (hidden when rejected) */}
        {!isDealRejected && deal.deal_stage === 'Negotiating Terms' && !bothAgreed && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-black/30 text-white">
              {AgreementGuidelines}

              {userId && (
                <div className="mt-4">
                  <AgreementMatchCard
                    dealId={deal.id}
                    senderId={deal.sender_id}
                    receiverId={deal.receiver_id}
                    myUserId={userId}
                    onMatched={() => void refreshDeal(deal.id)}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={agreeChecked}
                    onChange={(e) => setAgreeChecked(e.target.checked)}
                  />
                  I have read and agree to the Niesty Deal Agreement.
                </label>
                <button
                  className="ml-auto px-4 py-2 bg-emerald-600 rounded text-white text-sm sm:text-base disabled:opacity-50"
                  onClick={handleConfirmAgreement}
                  disabled={!agreeChecked}
                >
                  Confirm Agreement
                </button>
              </div>

              <div className="mt-2 text-[11px] sm:text-xs text-gray-400">
                Creator: {deal.creator_agreed_at ? '✔ confirmed' : '— pending'} ·{' '}
                Business: {deal.business_agreed_at ? '✔ confirmed' : '— pending'}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT: Locked view after both agree (hidden when rejected) */}
        {!isDealRejected && bothAgreed && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-700/40 bg-emerald-900/20 text-white">
              {AgreementGuidelines}

              <div className="flex items-baseline justify-between gap-2">
                <p className="text-emerald-300 font-semibold text-base sm:text-lg">
                  Agreement Locked
                </p>
                <span className="text-xs sm:text-sm">
                  Amount:&nbsp;
                  <span className="font-semibold">
                    {deal?.deal_value && deal.deal_value > 0
                      ? `$${Math.round(deal.deal_value).toLocaleString()} USD`
                      : '—'}
                  </span>
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-2 text-sm">
                <p>
                  <span className="text-white/70">Deadline:</span> {lockedDeadline}
                </p>
                
              </div>
              <p className="text-xs text-emerald-300 mt-2">
                Next: Business deposits funds in <b>Platform Escrow</b>. Only then content submission opens.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ======= CONTENT DELIVERY ======= */}
      {!isDealRejected && (
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
                Approval moves the deal to <span className="font-semibold">Approved</span>. Rejection returns to{' '}
                <span className="font-semibold">Content Submitted</span> with your reason.
              </p>
            </div>
          )}

          {/* Payout in progress hint */}
          {payoutInFlight && !deal.payment_released_at && (
            <p className="mt-3 text-xs text-yellow-300">
              Payment is being released. <span className="opacity-80">Final stage shows a pending clock until funds land.</span>
            </p>
          )}
        </div>
      )}

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