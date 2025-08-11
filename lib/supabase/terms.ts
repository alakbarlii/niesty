'use client';

import { supabase } from '@/lib/supabase';

const TABLE = 'deal_term_proposals' as const;

export type TermProposal = {
  id: string;
  deal_id: string;
  user_id: string;
  amount: number;
  /** ISO date string like 'YYYY-MM-DD' */
  deadline: string;
  created_at: string;
};

export type ProposalPair = {
  sender: TermProposal | null;
  receiver: TermProposal | null;
};

/** Get the current authenticated user's ID (or null). */
export async function getMyUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

/** Insert a proposal (amount + deadline) for the current user. */
export async function proposeTerms(
  dealId: string,
  amount: number,
  deadline: string
): Promise<void> {
  if (!dealId) throw new Error('Missing deal id');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');
  if (!deadline) throw new Error('Deadline required');

  const uid = await getMyUserId();
  if (!uid) throw new Error('Not authenticated');

  const { error } = await supabase
    .from(TABLE)
    .insert([{ deal_id: dealId, user_id: uid, amount, deadline }]);

  if (error) throw new Error(error.message);
}

/**
 * Fetch the latest proposal for both parties (sender vs receiver).
 * Returns each side's most recent row (by created_at desc), or null if none.
 */
export async function fetchLatestPair(
  dealId: string,
  senderId: string,
  receiverId: string
): Promise<ProposalPair> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, deal_id, user_id, amount, deadline, created_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows: TermProposal[] = (data ?? []) as TermProposal[];

  // Keep only the first (latest) proposal per user.
  const latestByUser = new Map<string, TermProposal>();
  for (const row of rows) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, row);
    }
  }

  return {
    sender: latestByUser.get(senderId) ?? null,
    receiver: latestByUser.get(receiverId) ?? null,
  };
}

/** True when both sides proposed the same amount and the same YYYY-MM-DD deadline. */
export function proposalsMatch(
  a: TermProposal | null,
  b: TermProposal | null
): boolean {
  if (!a || !b) return false;
  const amtEqual = Number(a.amount) === Number(b.amount);
  const da = String(a.deadline).slice(0, 10);
  const db = String(b.deadline).slice(0, 10);
  return amtEqual && da === db;
}
