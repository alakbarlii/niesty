'use client';

import { supabase } from '@/lib/supabase';

export type TermProposal = {
  id: string;
  deal_id: string;
  user_id: string;
  amount: number;
  /** ISO date string yyyy-mm-dd (or full ISO; UI slices to 10) */
  deadline: string;
  created_at: string;
  /** Present if your table has a trigger/column; otherwise null/undefined */
  updated_at?: string | null;
};

export async function getMyUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

/**
 * Create a (new) proposal row for the given user.
 * We keep proposals append-only (no upsert by PK) so history is preserved.
 */
export async function upsertProposal(
  dealId: string,
  userId: string,
  params: { amount: number; deadline: string }
): Promise<void> {
  const { amount, deadline } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }
  if (!deadline) {
    throw new Error('Deadline required');
  }
  if (!dealId || !userId) {
    throw new Error('Missing deal or user');
  }

  const { error } = await supabase
    .from('deal_term_proposals')
    .insert([{ deal_id: dealId, user_id: userId, amount, deadline }]);

  if (error) throw new Error(error.message);
}

/**
 * Fetch the latest proposal for each party.
 * We only pull rows for sender/receiver and pick the newest by created_at.
 */
export async function fetchLatestPair(
  dealId: string,
  senderId: string,
  receiverId: string
): Promise<{ sender: TermProposal | null; receiver: TermProposal | null }> {
  const { data, error } = await supabase
    .from('deal_term_proposals')
    .select('id, deal_id, user_id, amount, deadline, created_at, updated_at')
    .eq('deal_id', dealId)
    .in('user_id', [senderId, receiverId])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data as TermProposal[]) ?? [];

  let latestSender: TermProposal | null = null;
  let latestReceiver: TermProposal | null = null;

  for (const r of rows) {
    if (r.user_id === senderId && !latestSender) latestSender = r;
    if (r.user_id === receiverId && !latestReceiver) latestReceiver = r;
    if (latestSender && latestReceiver) break;
  }

  return { sender: latestSender, receiver: latestReceiver };
}

/**
 * Mark the current user as agreed on the deal.
 * - Reads the caller's role from profiles
 * - Stamps creator_agreed_at OR business_agreed_at
 * - If both timestamps present afterwards, moves stage to "Platform Escrow"
 */
export async function confirmAgreement(dealId: string): Promise<void> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  const uid = auth.user?.id;
  if (!uid) throw new Error('Not authenticated');

  // get my role
  const { data: prof, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .maybeSingle();
  if (roleErr) throw new Error(roleErr.message);
  const role = prof?.role as 'creator' | 'business' | undefined;
  if (role !== 'creator' && role !== 'business') {
    throw new Error('Unsupported or missing role');
  }

  const col = role === 'creator' ? 'creator_agreed_at' : 'business_agreed_at';

  // stamp my side
  const { error: updErr } = await supabase
    .from('deals')
    .update({ [col]: new Date().toISOString() })
    .eq('id', dealId);
  if (updErr) throw new Error(updErr.message);

  // check if both sides are done, then advance stage
  const { data: after, error: readErr } = await supabase
    .from('deals')
    .select('creator_agreed_at, business_agreed_at, deal_stage')
    .eq('id', dealId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  const both =
    !!after?.creator_agreed_at &&
    !!after?.business_agreed_at;

  if (both && after?.deal_stage !== 'Platform Escrow') {
    const { error: stageErr } = await supabase
      .from('deals')
      .update({ deal_stage: 'Platform Escrow' })
      .eq('id', dealId);
    if (stageErr) throw new Error(stageErr.message);
  }
}

/** Exact-match helper used by UI to decide if terms align */
export function proposalsMatch(a: TermProposal | null, b: TermProposal | null): boolean {
  if (!a || !b) return false;
  const amtEqual = Number(a.amount) === Number(b.amount);
  const da = String(a.deadline).slice(0, 10);
  const db = String(b.deadline).slice(0, 10);
  return amtEqual && da === db;
}
