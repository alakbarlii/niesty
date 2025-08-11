'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Copy, Loader2, RefreshCw } from 'lucide-react';
import {
  // helpers from lib/supabase/terms.ts
  fetchLatestPair,            // returns { sender: TermProposal|null, receiver: TermProposal|null }
  upsertProposal,             // (dealId, userId, { amount, deadline })
  confirmAgreement,           // (dealId) -> stamps creator/business agreed
  type TermProposal,          // { amount:number, deadline:string, updated_at?:string, created_at?:string, ... }
} from '@/lib/supabase/terms';

type Props = {
  dealId: string;
  senderId: string;
  receiverId: string;
  myUserId: string;
  onMatched?: () => void;
};

type Pair = {
  mine: TermProposal | null;
  other: TermProposal | null;
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
  const [amount, setAmount] = useState<number | ''>('');
  const [deadline, setDeadline] = useState<string>(''); // yyyy-mm-dd
  const [agreeChecked, setAgreeChecked] = useState(false);

  const [pair, setPair] = useState<Pair>({ mine: null, other: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const normalizeTs = (p: TermProposal | null) =>
    p ? (p.updated_at ?? p.created_at ?? null) : null;

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const raw = await fetchLatestPair(dealId, senderId, receiverId); // { sender, receiver }
      const mine = myUserId === senderId ? raw.sender : raw.receiver;
      const other = myUserId === senderId ? raw.receiver : raw.sender;
      setPair({ mine, other });

      // seed inputs with my latest
      if (mine) {
        setAmount(mine.amount);
        setDeadline(mine.deadline.slice(0, 10));
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

  const matched = useMemo(() => {
    const a = pair.mine?.amount ?? null;
    const b = pair.other?.amount ?? null;
    const d1 = pair.mine?.deadline?.slice(0, 10) ?? null;
    const d2 = pair.other?.deadline?.slice(0, 10) ?? null;
    return a !== null && b !== null && d1 !== null && d2 !== null && a === b && d1 === d2;
  }, [pair]);

  const submit = async () => {
    setErr(null);
    const amt = typeof amount === 'number' ? amount : Number.NaN;
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Enter a valid amount.');
      return;
    }
    if (!deadline) {
      setErr('Pick a delivery date.');
      return;
    }

    setSaving(true);
    try {
      await upsertProposal(dealId, myUserId, { amount: amt, deadline });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  const copyOthersValues = () => {
    if (!pair.other) return;
    setAmount(pair.other.amount);
    setDeadline(pair.other.deadline.slice(0, 10));
  };

  const confirm = async () => {
    if (!matched) return;
    if (!agreeChecked) {
      setErr('Please check the agreement box.');
      return;
    }
    setSaving(true);
    try {
      await confirmAgreement(dealId);
      setAgreeChecked(false);
      if (onMatched) onMatched();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to confirm agreement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-black/30 text-white">
      <div className="flex items-center justify-between">
        <p className="text-base sm:text-lg font-semibold">Match Terms (both must propose the same)</p>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-yellow-400"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount (USD)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
            placeholder="Enter amount"
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

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => void submit()}
          disabled={saving}
          className="px-3 py-2 bg-gray-700 rounded text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Update Proposal
        </button>
        <button
          onClick={copyOthersValues}
          disabled={!pair.other}
          className="px-3 py-2 bg-gray-700/60 rounded text-sm inline-flex items-center gap-2 disabled:opacity-50"
          title={pair.other ? 'Copy the other side’s latest values' : 'No proposal from other side yet'}
        >
          <Copy className="w-4 h-4" />
          Copy Other’s Values
        </button>

        <div className="ml-auto flex items-center gap-2">
          {matched ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Terms matched — you can confirm now
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-yellow-300 text-xs">
              <Clock className="w-4 h-4" />
              Waiting for both to match
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={agreeChecked}
            onChange={(e) => setAgreeChecked(e.target.checked)}
          />
          I have read and agree to the Niesty Deal Agreement (price & delivery date).
        </label>
        <button
          onClick={() => void confirm()}
          disabled={!matched || !agreeChecked || saving}
          className="ml-auto px-4 py-2 bg-emerald-600 rounded text-white text-sm disabled:opacity-50"
        >
          Confirm Agreement
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold mb-1">Your latest</p>
          <p className="text-sm">
            Amount: <span className="font-semibold">${pair.mine?.amount ?? '—'}</span>
          </p>
          <p className="text-sm">
            Deadline:{' '}
            <span className="font-semibold">
              {pair.mine?.deadline ? pair.mine.deadline.slice(0, 10) : '—'}
            </span>
          </p>
          <p className="text-[11px] text-white/60 mt-1">Updated: {fmt(normalizeTs(pair.mine))}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold mb-1">Other side’s latest</p>
          <p className="text-sm">
            Amount: <span className="font-semibold">${pair.other?.amount ?? '—'}</span>
          </p>
          <p className="text-sm">
            Deadline:{' '}
            <span className="font-semibold">
              {pair.other?.deadline ? pair.other.deadline.slice(0, 10) : '—'}
            </span>
          </p>
          <p className="text-[11px] text-white/60 mt-1">Updated: {fmt(normalizeTs(pair.other))}</p>
        </div>
      </div>

      {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
    </div>
  );
}
