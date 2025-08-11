'use client';

import { supabase } from '@/lib/supabase';

export type TermProposal = {
  id: string;
  deal_id: string;
  user_id: string;
  amount: number;
  deadline: string;   // yyyy-mm-dd
  created_at: string;
};

export async function getMyUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Insert a proposal (amount + deadline) for current user */
export async function proposeTerms(dealId: string, amount: number, deadline: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');
  if (!deadline) throw new Error('Deadline required');

  const uid = await getMyUserId();
  if (!uid) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('deal_term_proposals')
    .insert([{ deal_id: dealId, user_id: uid, amount, deadline }]);

  if (error) throw new Error(error.message);
}

/** Fetch the latest proposal per party (sender vs receiver) */
export async function fetchLatestPair(
  dealId: string,
  senderId: string,
  receiverId: string
) {
  const { data, error } = await supabase
    .from('deal_term_proposals')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = TermProposal;

  const latestByUser = new Map<string, Row>();
  (data as Row[]).forEach((row) => {
    if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row);
  });

  return {
    sender: latestByUser.get(senderId) ?? null,
    receiver: latestByUser.get(receiverId) ?? null,
  };
}

/** Decide if both latest proposals match (strict equality) */
export function proposalsMatch(a: TermProposal | null, b: TermProposal | null) {
  if (!a || !b) return false;
  const amtEqual = Number(a.amount) === Number(b.amount);
  const da = String(a.deadline).slice(0, 10);
  const db = String(b.deadline).slice(0, 10);
  return amtEqual && da === db;
}
