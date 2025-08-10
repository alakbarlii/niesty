'use client';

import { supabase } from '@/lib/supabase';

export type SubmissionStatus = 'pending' | 'rework' | 'approved';

export type DealSubmission = {
  id: string;
  deal_id: string;
  submitted_by: string;
  url: string;
  status: SubmissionStatus;
  rejection_reason: string | null;
};

const ORDER_COLUMN = 'id' as const;

/** Latest submission for a deal (safe ordering). */
export async function fetchLatestSubmission(dealId: string): Promise<DealSubmission | null> {
  const { data, error } = await supabase
    .from('deal_submissions')
    .select('*')
    .eq('deal_id', dealId)
    .order(ORDER_COLUMN, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as DealSubmission) ?? null;
}

/**
 * Create/Resubmit via SECURITY DEFINER RPC.
 * `_userId` kept for call-site compatibility; server uses auth.uid().
 */
export async function submitSubmission(
  dealId: string,
  url: string,
  _userId: string
): Promise<void> {
  // mark as used to satisfy eslint no-unused-vars
  void _userId;

  const { error } = await supabase.rpc('submit_deal_content', {
    p_deal_id: dealId,
    p_url: url,
  });
  if (error) throw error;
}

/** Approve via SECURITY DEFINER RPC. `_dealId` kept for compatibility. */
export async function approveSubmission(
  submissionId: string,
  _dealId: string
): Promise<void> {
  void _dealId;

  const { error } = await supabase.rpc('approve_deal_submission', {
    p_submission_id: submissionId,
  });
  if (error) throw error;
}

/** Reject via SECURITY DEFINER RPC. `_dealId` kept for compatibility. */
export async function rejectSubmission(
  submissionId: string,
  _dealId: string,
  reason: string
): Promise<void> {
  void _dealId;

  const { error } = await supabase.rpc('reject_deal_submission', {
    p_submission_id: submissionId,
    p_reason: reason,
  });
  if (error) throw error;
}

/* ---------- Optional read-only helpers ---------- */

export async function listSubmissionsByUser(userId: string, limit = 20): Promise<DealSubmission[]> {
  const { data, error } = await supabase
    .from('deal_submissions')
    .select('*')
    .eq('submitted_by', userId)
    .order(ORDER_COLUMN, { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as DealSubmission[]) ?? [];
}

export async function countSubmissionsByUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('deal_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId);

  if (error) throw error;
  return count ?? 0;
}
