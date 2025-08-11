'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchLatestPair,
  proposeTerms,
  proposalsMatch,
  type TermProposal,
} from '@/lib/supabase/terms';

type Props = {
  dealId: string;
  senderId: string;
  receiverId: string;
  myUserId: string;
  /** Called after a successful save so parent can refresh */
  onMatched?: () => void;
};

type Pair = {
  sender: TermProposal | null;
  receiver: TermProposal | null;
};

function fmt(ts?: string | null) {
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
}

export default function AgreementMatchCard({
  dealId,
  senderId,
  receiverId,
  myUserId,
  onMatched,
}: Props) {
  const [pair, setPair] = useState<Pair>({ sender: null, receiver: null });
  const [amount, setAmount] = useState<number | ''>('');
  const [deadline, setDeadline] = useState<string>(''); // yyyy-mm-dd
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const myProposal: TermProposal | null = useMemo(() => {
    const mine =
      pair.sender?.user_id === myUserId
        ? pair.sender
        : pair.receiver?.user_id === myUserId
        ? pair.receiver
        : null;
    return mine ?? null;
  }, [pair, myUserId]);

  const otherProposal: TermProposal | null = useMemo(() => {
    const other =
      pair.sender && pair.sender.user_id !== myUserId ? pair.sender : null;
    const alt =
      pair.receiver && pair.receiver.user_id !== myUserId
        ? pair.receiver
        : null;
    return other ?? alt ?? null;
  }, [pair, myUserId]);

  const matched = proposalsMatch(pair.sender, pair.receiver);

  // Load latest proposals and seed inputs with my latest (if any)
  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const p = await fetchLatestPair(dealId, senderId, receiverId);
      setPair(p);

      const mine =
        p.sender?.user_id === myUserId
          ? p.sender
          : p.receiver?.user_id === myUserId
          ? p.receiver
          : null;

      if (mine) {
        setAmount(mine.amount);
        setDeadline(String(mine.deadline).slice(0, 10));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, senderId, receiverId, myUserId]);

  const handleSave = async () => {
    setErr(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Enter a valid amount');
      return;
    }
    if (!deadline) {
      setErr('Pick a delivery date');
      return;
    }

    setSaving(true);
    try {
      await proposeTerms(dealId, amt, deadline);
      await load(); // refresh local view
      if (onMatched) onMatched(); // let parent refresh the deal/timeline
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyOther = () => {
    if (!otherProposal) return;
    setAmount(otherProposal.amount);
    setDeadline(String(otherProposal.deadline).slice(0, 10));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-base font-semibold">Match Terms (both must propose the same)</p>
        {matched && (
          <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-300">
            Terms matched — you can confirm the agreement now.
          </span>
        )}
      </div>

      {/* Inputs */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount (USD)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
            placeholder="Enter agreed amount"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Delivery date</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-3 py-2 bg-gray-700 rounded text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Update Proposal'}
        </button>
        <button
          onClick={copyOther}
          disabled={!otherProposal}
          className="px-3 py-2 bg-gray-700/60 rounded text-sm disabled:opacity-50"
        >
          Copy Other’s Values
        </button>
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>

      {/* Latest snapshot */}
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold mb-1">Your latest</p>
          <p className="text-xs text-white/80">
            Amount: {myProposal ? `$${myProposal.amount.toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-white/80">
            Deadline: {myProposal ? String(myProposal.deadline).slice(0, 10) : '—'}
          </p>
          <p className="text-[11px] text-white/50">At: {fmt(myProposal?.created_at)}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold mb-1">Receiver’s latest</p>
          <p className="text-xs text-white/80">
            Amount: {otherProposal ? `$${otherProposal.amount.toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-white/80">
            Deadline: {otherProposal ? String(otherProposal.deadline).slice(0, 10) : '—'}
          </p>
          <p className="text-[11px] text-white/50">At: {fmt(otherProposal?.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
