'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  BadgeDollarSign,
  ShieldCheck,
} from 'lucide-react';

type Role = 'business' | 'creator' | null;

type Deal = {
  id: string;
  deal_id: string;
  sender_id: string;
  receiver_id: string;
  deal_value: number | null;
  deal_stage: string;
  created_at: string;

  message?: string | null;

  accepted_at?: string | null;
  escrow_funded_at?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  payout_requested_at?: string | null;
  payment_released_at?: string | null;

  payout_status?: 'requested' | 'paid' | null;
  is_paid?: boolean | null;

  agreement_terms?: string | null;
  creator_agreed_at?: string | null;
  business_agreed_at?: string | null;

  is_escrow_funded?: boolean | null;

  submission_status?: 'pending' | 'approved' | 'rework' | null;
  rejection_reason?: string | null;
};

type Profile = { id: string; full_name: string | null; role: Role };

type Submission = {
  id: string;
  deal_id: string;
  submitted_by: string;
  submission_link: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
};

type Patch = Partial<Deal>;

const STAGES = [
  'Waiting for Response',
  'Negotiating Terms',
  'Platform Escrow',
  'Content Submitted',
  'Approved',
  'Payment Released',
] as const;

const money = (n?: number | null) =>
  (n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmt = (ts?: string | null) => {
  if (!ts) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(ts));
  } catch {
    return '—';
  }
};

function RolePill({ role }: { role: Role }) {
  const base = 'px-2 py-0.5 rounded-full text-xs border';
  if (role === 'business') return <span className={`${base} bg-sky-900/60 text-sky-300 border-sky-700/40`}>Business</span>;
  if (role === 'creator') return <span className={`${base} bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-700/40`}>Creator</span>;
  return <span className={`${base} bg-gray-700 text-gray-300 border-gray-600`}>—</span>;
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [sender, setSender] = useState<Profile | null>(null);
  const [receiver, setReceiver] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Single-confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string>('');
  const [confirmResolve, setConfirmResolve] = useState<((v: boolean) => void) | null>(null);
  const confirm = (msg: string) =>
    new Promise<boolean>((resolve) => {
      setConfirmMsg(msg);
      setConfirmResolve(() => resolve);
      setConfirmOpen(true);
    });
  const handleConfirmYes = () => {
    confirmResolve?.(true);
    setConfirmOpen(false);
    setConfirmResolve(null);
  };
  const handleConfirmNo = () => {
    confirmResolve?.(false);
    setConfirmOpen(false);
    setConfirmResolve(null);
  };

  // load deal + party names + submissions
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: d, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .maybeSingle<Deal>();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setDeal(d ?? null);

      if (d) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', [d.sender_id, d.receiver_id]);

        const profiles: Profile[] = (profilesData ?? []).map((p) => ({
          id: (p as Profile).id,
          full_name: (p as Profile).full_name ?? null,
          role: (p as Profile).role ?? null,
        }));

        const map = new Map<string, Profile>();
        profiles.forEach((p) => map.set(p.id, p));
        setSender(map.get(d.sender_id) || null);
        setReceiver(map.get(d.receiver_id) || null);

        const { data: subs } = await supabase
          .from('deal_submissions')
          .select('*')
          .eq('deal_id', id)
          .order('submitted_at', { ascending: false });

        setSubmissions(((subs ?? []) as Submission[]));
      }

      setLoading(false);
    })();
  }, [id]);

  const nowISO = () => new Date().toISOString();

  const postAdmin = async (patch: Patch): Promise<void> => {
    const res = await fetch(`/api/admin/deals/${id}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Update failed');
    }
  };

  const refreshSubmissions = async () => {
    const { data: subs } = await supabase
      .from('deal_submissions')
      .select('*')
      .eq('deal_id', id)
      .order('submitted_at', { ascending: false });

    setSubmissions(((subs ?? []) as Submission[]));
  };

  const optimistic = async (patch: Patch) => {
    if (!deal) return;
    const prev = deal;
    setDeal({ ...deal, ...patch });
    try {
      await postAdmin(patch);
      await refreshSubmissions();
    } catch (e) {
      setDeal(prev);
      throw e instanceof Error ? e : new Error('Update failed');
    }
  };

  // Agreement helpers
  const bothAgreed = !!deal?.creator_agreed_at && !!deal?.business_agreed_at;

  // ensure DB stage persists when both agreed
  const ensureEscrowStageIfBothAgreed = async () => {
    if (!deal) return;
    const { data: fresh } = await supabase
      .from('deals')
      .select('id, creator_agreed_at, business_agreed_at, deal_stage')
      .eq('id', deal.id)
      .maybeSingle<Pick<Deal, 'id' | 'creator_agreed_at' | 'business_agreed_at' | 'deal_stage'>>();

    const both = !!fresh?.creator_agreed_at && !!fresh?.business_agreed_at;
    if (both && fresh?.deal_stage !== 'Platform Escrow') {
      await postAdmin({ deal_stage: 'Platform Escrow' });
      setDeal((prev) => (prev ? { ...prev, deal_stage: 'Platform Escrow' } : prev));
    }
  };

  // Progress index (no skipping)
  const stageIdx = useMemo(() => {
    if (!deal) return -1;

    let idx = 0; // Waiting
    if (deal.accepted_at) idx = 1;                 // Negotiating
    if (bothAgreed) idx = 2;                       // Platform Escrow
    if (deal.submitted_at) idx = 3;                // Content Submitted
    if (deal.approved_at) idx = 4;                 // Approved
    if (deal.payment_released_at) idx = 5;         // Payment Released

    return Math.min(idx, STAGES.length - 1);
  }, [deal, bothAgreed]);

  const isNegotiating = stageIdx === 1;
  const isPaymentInProgress =
    !!deal?.approved_at && !deal?.payment_released_at && !!deal?.payout_requested_at && deal?.payout_status === 'requested';

  // TIMESTAMPS
  const stageTimes: Record<string, string | null | undefined> = useMemo(() => {
    if (!deal) return {};
    return {
      'Waiting for Response': deal.created_at,
      'Negotiating Terms': deal.accepted_at ?? (bothAgreed ? deal.creator_agreed_at || deal.business_agreed_at : null),
      'Platform Escrow': deal.escrow_funded_at ?? (bothAgreed ? deal.creator_agreed_at || deal.business_agreed_at : null),
      'Content Submitted': deal.submitted_at,
      'Approved': deal.approved_at,
      'Payment Released': deal.payment_released_at ?? deal.payout_requested_at,
    };
  }, [deal, bothAgreed]);

  // ===== Admin override to force-advance missing prereqs for testing =====
  const buildForcePatchForNext = (idx: number): Patch => {
    const now = nowISO();
    const patch: Patch = {};

    switch (idx) {
      case 0: // Waiting -> Negotiating
        patch.accepted_at = now;
        break;

      case 1: // Negotiating -> Escrow
        if (!deal?.creator_agreed_at) patch.creator_agreed_at = now;
        if (!deal?.business_agreed_at) patch.business_agreed_at = now;
        patch.deal_stage = 'Platform Escrow';
        break;

      case 2: // Escrow -> Content Submitted
        if (!deal?.escrow_funded_at) {
          patch.escrow_funded_at = now;
          patch.is_escrow_funded = true;
        }
        break;

      case 3: // Content Submitted -> Approved
        if (!deal?.submitted_at) patch.submitted_at = now;
        patch.approved_at = now;
        patch.submission_status = 'approved';
        break;

      case 4: // Approved -> Payment Released (processing)
        if (!deal?.approved_at) {
          patch.approved_at = now;
          patch.submission_status = 'approved';
        }
        if (!deal?.payout_requested_at) {
          patch.payout_requested_at = now;
          patch.payout_status = 'requested';
        }
        break;

      case 5: // Payment Released -> Paid
        if (!deal?.payment_released_at) {
          patch.payment_released_at = now;
          patch.payout_status = 'paid';
          patch.is_paid = true;
        }
        break;
    }
    return patch;
  };

  const forceAdvance = async () => {
    const patch = buildForcePatchForNext(stageIdx);
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    try {
      await optimistic(patch);
      await ensureEscrowStageIfBothAgreed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };
  // =====================================================================

  // ACTIONS (kept; triggered via Back/Next)
  const resetToWaiting = async () => {
    if (!(await confirm('Reset this deal back to “Waiting for Response”?'))) return;
    setSaving(true);
    try {
      await optimistic({
        deal_stage: 'Waiting for Response',
        accepted_at: null,
        creator_agreed_at: null,
        business_agreed_at: null,
        escrow_funded_at: null,
        submitted_at: null,
        approved_at: null,
        payout_requested_at: null,
        payout_status: null,
        payment_released_at: null,
        submission_status: null,
        rejection_reason: null,
        is_escrow_funded: false,
        is_paid: false,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const acceptOffer = async () => {
    if (!(await confirm('Mark offer as accepted?'))) return;
    setSaving(true);
    try {
      await optimistic({ accepted_at: nowISO() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const forceAgreeSide = async (side: 'creator' | 'business') => {
    if (!(await confirm(`Confirm ${side} agreed?`))) return;
    setSaving(true);
    try {
      const patch: Patch =
        side === 'creator'
          ? { creator_agreed_at: nowISO() }
          : { business_agreed_at: nowISO() };
      await optimistic(patch);
      await ensureEscrowStageIfBothAgreed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const markEscrowFunded = async () => {
    if (!(await confirm('Mark escrow as funded?'))) return;
    setSaving(true);
    try {
      await optimistic({ escrow_funded_at: nowISO(), is_escrow_funded: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const markSubmitted = async () => {
    if (!(await confirm('Mark content as submitted?'))) return;
    setSaving(true);
    try {
      await optimistic({ submitted_at: nowISO() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const approveContent = async () => {
    if (!(await confirm('Approve the submitted content?'))) return;
    setSaving(true);
    try {
      await optimistic({ approved_at: nowISO(), submission_status: 'approved' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const triggerPayout = async () => {
    if (!(await confirm('Trigger payout now?'))) return;
    setSaving(true);
    try {
      await optimistic({ payout_requested_at: nowISO(), payout_status: 'requested' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    if (!(await confirm('Mark as paid (funds landed)?'))) return;
    setSaving(true);
    try {
      await optimistic({ payment_released_at: nowISO(), payout_status: 'paid', is_paid: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const saveAgreementTerms = async (_terms: string) => {
    // NO-OP: admin cannot edit agreement terms here
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Back/Next driver
  const nextAction = () => {
    if (!deal) return { label: 'Next', fn: async () => Promise.resolve(), disabled: true, tip: 'No deal loaded' as const };

    switch (stageIdx) {
      case 0:
        return { label: 'Accept Offer', fn: acceptOffer, disabled: false, tip: '' as const };
      case 1:
        if (!bothAgreed) return { label: 'Need Both to Agree', fn: async () => Promise.resolve(), disabled: true, tip: 'Confirm both sides' as const };
        return { label: 'Mark Escrow Funded', fn: markEscrowFunded, disabled: false, tip: '' as const };
      case 2:
        if (!deal.escrow_funded_at) return { label: 'Escrow not funded', fn: async () => Promise.resolve(), disabled: true, tip: 'Fund escrow first' as const };
        return { label: 'Mark Content Submitted', fn: markSubmitted, disabled: false, tip: '' as const };
      case 3:
        if (!deal.submitted_at) return { label: 'Awaiting Submission', fn: async () => Promise.resolve(), disabled: true, tip: '' as const };
        if (deal.submission_status === 'rework') return { label: 'Waiting for Corrected Submission', fn: async () => Promise.resolve(), disabled: true, tip: 'Ask creator to resubmit' as const };
        return { label: 'Approve Content', fn: approveContent, disabled: false, tip: '' as const };
      case 4:
        if (!deal.approved_at) return { label: 'Approve first', fn: async () => Promise.resolve(), disabled: true, tip: '' as const };
        if (!deal.payout_requested_at) return { label: 'Trigger Payout', fn: triggerPayout, disabled: false, tip: '' as const };
        if (!deal.payment_released_at) return { label: 'Mark Paid', fn: markPaid, disabled: false, tip: 'Funds landed' as const };
        return { label: 'Done', fn: async () => Promise.resolve(), disabled: true, tip: '' as const };
      case 5:
        if (!deal.payment_released_at) return { label: 'Mark Paid', fn: markPaid, disabled: false, tip: '' as const };
        return { label: 'Done', fn: async () => Promise.resolve(), disabled: true, tip: '' as const };
      default:
        return { label: 'Done', fn: async () => Promise.resolve(), disabled: true, tip: '' as const };
    }
  };

  const prevAction = () => {
    if (!deal) return { label: 'Back', fn: async () => Promise.resolve(), disabled: true as const };
    switch (stageIdx) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        return { label: 'Back to Waiting', fn: resetToWaiting, disabled: false as const };
      default:
        return { label: 'Back', fn: async () => Promise.resolve(), disabled: true as const };
    }
  };

  if (loading) return <main className="p-6 text-white">Loading…</main>;
  if (!deal) return <main className="p-6 text-white">Deal not found.</main>;

  const displayAmount = deal.deal_value ?? undefined;

  return (
    <main className="p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deal #{deal.deal_id}</h1>
          <p className="text-sm text-gray-400">Created {fmt(deal.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/deals" className="text-blue-400 underline ml-2">Back</Link>
          <button onClick={() => router.refresh()} className="px-3 py-1 bg-gray-700 rounded">Refresh</button>
        </div>
      </div>

      {/* Parties + Offer */}
      <div className="bg-[#0f172a] rounded-2xl p-5 border border-white/10">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="space-y-1 truncate">
            <p className="text-sm text-gray-400">Sender</p>
            <p className="text-blue-300 text-lg truncate">{sender?.full_name || 'Unknown'}</p>
            <RolePill role={sender?.role ?? null} />
          </div>

          <div className="flex flex-col items-center">
            <ArrowRight className="h-5 w-5 text-gray-400 mb-1" />
            <div className="text-center">
              <p className="text-xs text-gray-400">Offer</p>
              <p className="text-emerald-400 text-lg font-semibold break-words">
                {deal.message || '—'}
              </p>
            </div>
          </div>

          <div className="text-right space-y-1 truncate">
            <p className="text-sm text-gray-400">Receiver</p>
            <p className="text-blue-300 text-lg truncate">{receiver?.full_name || 'Unknown'}</p>
            <div className="flex justify-end">
              <RolePill role={receiver?.role ?? null} />
            </div>
          </div>
        </div>
      </div>

      {/* Agreements */}
      <div className="bg-[#0f172a] rounded-2xl p-5 border border-white/10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg font-semibold flex items-center gap-3">
            Deal Agreements
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
              <BadgeDollarSign className="h-4 w-4" />
              {displayAmount ? money(displayAmount) : '—'}
            </span>
          </p>
          <div className="flex gap-2">
            <span className="text-xs text-gray-300">
              Creator: {deal.creator_agreed_at ? `Agreed • ${fmt(deal.creator_agreed_at)}` : 'Not agreed'}
            </span>
            <span className="text-xs text-gray-300">
              Business: {deal.business_agreed_at ? `Agreed • ${fmt(deal.business_agreed_at)}` : 'Not agreed'}
            </span>
          </div>
        </div>

        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <textarea
            value={deal.agreement_terms || ''}
            readOnly
            disabled
            placeholder="Agreement terms are auto-filled from the platform."
            className="w-full h-32 bg-[#0b1222] border border-white/10 rounded p-3 text-sm opacity-70 cursor-not-allowed"
          />

          <div className="bg-[#0b1222] border border-white/10 rounded p-3 text-sm space-y-2">
            <p className="text-gray-300">Agreement Confirmation</p>

            {isNegotiating && !bothAgreed ? (
              <>
                <button
                  className="px-3 py-1 bg-gray-700 rounded w-full"
                  disabled={saving}
                  onClick={() => forceAgreeSide('creator')}
                >
                  Confirm Creator Agreed
                </button>
                <button
                  className="px-3 py-1 bg-gray-700 rounded w-full"
                  disabled={saving}
                  onClick={() => forceAgreeSide('business')}
                >
                  Confirm Business Agreed
                </button>
                <p className="text-xs text-gray-500">
                  Visible only during <b>Negotiating Terms</b>. Disappears once both agree.
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                {bothAgreed ? 'Both sides agreed. No actions needed.' : 'Agreement controls appear at Negotiating stage.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Deal Progress */}
      <div className="bg-[#0f172a] rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-semibold">Deal Progress</p>
        </div>

        <ol className="relative ms-4 border-s border-gray-700/50">
          {STAGES.map((label, idx) => {
            const current = idx === stageIdx;
            const done = idx < stageIdx || (label === 'Payment Released' && !!deal?.payment_released_at);
            const clockForPayment = label === 'Payment Released' && isPaymentInProgress;
            const showClock = current || clockForPayment;
            const showTick = done && !clockForPayment;
            const atTs = stageTimes[label];

            return (
              <li key={label} className="ms-6 pb-6 last:pb-0">
                <span
                  className={`absolute -start-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-offset-0 ${
                    showTick
                      ? 'bg-emerald-700 ring-emerald-400/50'
                      : showClock
                      ? 'bg-yellow-700 ring-yellow-400/40'
                      : 'bg-gray-700 ring-gray-500/30'
                  }`}
                >
                  {showTick ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  ) : showClock ? (
                    <Clock className="h-4 w-4 text-yellow-200" />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-300" />
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <span className={`text-base ${showTick ? 'text-emerald-300' : showClock ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {label}
                  </span>
                  {clockForPayment && <span className="text-xs text-yellow-300">payout in progress</span>}
                </div>
                <p className="text-sm text-gray-400 mt-1">At: {fmt(atTs)}</p>
              </li>
            );
          })}
        </ol>

        {/* Back / Next */}
        <div className="flex items-center gap-2 mt-4">
          <button
            className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-50"
            disabled={prevAction().disabled || saving}
            onClick={async () => {
              const p = prevAction();
              if (p.disabled) return;
              if (!(await confirm(p.label + '?'))) return;
              await p.fn();
            }}
            title="Go back safely"
          >
            ← {prevAction().label}
          </button>

          <button
            className="px-3 py-1 bg-emerald-700 rounded text-sm disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              const n = nextAction();
              if (!n.disabled) {
                if (!(await confirm(n.label + '?'))) return;
                await n.fn();
                return;
              }
              if (!(await confirm('Force advance and auto-fill missing steps?'))) return;
              await forceAdvance();
            }}
            title={nextAction().tip}
          >
            {nextAction().label} →
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          One confirmation per action. Admin can force-advance to simulate escrow/Stripe until live.
        </p>
      </div>

      {/* Submission History */}
      {(!!deal?.creator_agreed_at && !!deal?.business_agreed_at) && (
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold">Submission History</p>
          </div>

          {submissions.length === 0 ? (
            <p className="text-gray-400 text-sm">No submissions yet.</p>
          ) : (
            <ul className="space-y-3">
              {submissions.map((s) => (
                <li key={s.id} className="border border-white/10 rounded p-3 text-sm">
                  <p>
                    <span className="text-gray-300">Link:</span>{' '}
                    <a
                      href={s.submission_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline break-all"
                    >
                      {s.submission_link}
                    </a>
                  </p>
                  <p className="text-gray-400">Submitted: {fmt(s.submitted_at)}</p>
                  <p
                    className={`text-xs ${
                      s.status === 'approved'
                        ? 'text-emerald-400'
                        : s.status === 'rejected'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    Status: {s.status}
                  </p>
                  {s.rejection_reason && (
                    <p className="text-xs text-red-300">Reason: {s.rejection_reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {deal?.submission_status === 'rework' && (
            <p className="text-xs text-yellow-300 mt-3">
              Rework requested — deal stays at “Content Submitted” until an acceptable submission is approved.
            </p>
          )}
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleConfirmNo}
          />
          <div className="relative h-full w-full flex items-center justify-center">
            <div className="w-[95%] max-w-[500px] translate-y-6 rounded-lg border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
              <p className="text-lg font-semibold mb-2">Confirm action</p>
              <p className="text-gray-300 mb-6 text-base leading-snug">{confirmMsg}</p>
              <div className="flex items-center justify-end gap-3">
                <button className="px-4 py-2 rounded bg-gray-700 text-sm" onClick={handleConfirmNo}>
                  Cancel
                </button>
                <button className="px-4 py-2 rounded bg-emerald-700 text-sm" onClick={handleConfirmYes}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {err && <p className="text-red-400 text-sm">{err}</p>}
    </main>
  );
}
