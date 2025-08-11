'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  proposeTerms,
  fetchLatestPair,
  proposalsMatch,
  type TermProposal,
} from '@/lib/supabase/terms';

type Props = {
  dealId: string;
  senderId: string;
  receiverId: string;
  myUserId: string;
  /** Optional: notify parent when a match occurs */
  onMatched?: () => void;
};

export default function AgreementMatchCard({
  dealId,
  senderId,
  receiverId,
  myUserId,
  onMatched,
}: Props) {
  const [amount, setAmount] = useState<number | ''>('');
  const [deadline, setDeadline] = useState<string>(''); // yyyy-mm-dd
  const [loading, setLoading] = useState(false);
  const [pair, setPair] = useState<{
    sender: TermProposal | null;
    receiver: TermProposal | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const iAmSender = myUserId === senderId;

  const myProposal = useMemo(
    () => (pair ? (iAmSender ? pair.sender : pair.receiver) : null),
    [pair, iAmSender]
  );
  const otherProposal = useMemo(
    () => (pair ? (iAmSender ? pair.receiver : pair.sender) : null),
    [pair, iAmSender]
  );

  const matched = proposalsMatch(pair?.sender ?? null, pair?.receiver ?? null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const p = await fetchLatestPair(dealId, senderId, receiverId);
      setPair(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load proposals');
    }
  }, [dealId, senderId, receiverId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setErr(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Amount invalid');
      return;
    }
    if (!deadline) {
      setErr('Deadline required');
      return;
    }
    setLoading(true);
    try {
      await proposeTerms(dealId, amt, deadline);
      const newPair = await fetchLatestPair(dealId, senderId, receiverId);
      setPair(newPair);
      if (proposalsMatch(newPair.sender, newPair.receiver) && onMatched) onMatched();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  const copyOther = () => {
    if (!otherProposal) return;
    setAmount(Number(otherProposal.amount));
    setDeadline(String(otherProposal.deadline).slice(0, 10));
  };

  return (
    <div className="p-3 sm:p-4 rounded-xl border border-white/10 bg-black/30 text-white">
      <p className="text-sm font-semibold mb-2">Match Terms (both must propose the same)</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount (USD)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
            placeholder="e.g. 500"
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="px-3 py-2 bg-gray-700 rounded text-sm disabled:opacity-50"
        >
          {myProposal ? 'Update Proposal' : 'Propose Terms'}
        </button>

        <button
          onClick={copyOther}
          disabled={!otherProposal}
          className="px-3 py-2 bg-gray-700 rounded text-sm disabled:opacity-50"
          title="Copy the other party's latest values"
        >
          Copy Other’s Values
        </button>

        {matched ? (
          <span className="ml-auto text-xs text-emerald-300 font-semibold">
            ✅ Terms matched — you can confirm the agreement now.
          </span>
        ) : (
          <span className="ml-auto text-xs text-yellow-300">
            ⏳ Waiting for both to match the same amount and date.
          </span>
        )}
      </div>

      {/* Status strip */}
      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs text-white/80">
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <p className="font-semibold mb-1">{iAmSender ? 'Your latest' : "Sender's latest"}</p>
          <p>Amount: {pair?.sender ? `$${Number(pair.sender.amount).toLocaleString()}` : '—'}</p>
          <p>Deadline: {pair?.sender ? String(pair.sender.deadline).slice(0, 10) : '—'}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <p className="font-semibold mb-1">{iAmSender ? "Receiver's latest" : 'Your latest'}</p>
          <p>Amount: {pair?.receiver ? `$${Number(pair.receiver.amount).toLocaleString()}` : '—'}</p>
          <p>Deadline: {pair?.receiver ? String(pair.receiver.deadline).slice(0, 10) : '—'}</p>
        </div>
      </div>

      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
