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
  // Do NOT rely on timestamp columns (schema varies)
};

/** Single safe ordering (no schema probing -> no 400s) */
const ORDER_COLUMN = 'id' as const;

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

export async function submitSubmission(dealId: string, url: string, userId: string): Promise<void> {
  const { error: insErr } = await supabase
    .from('deal_submissions')
    .insert([{ deal_id: dealId, submitted_by: userId, url, status: 'pending' }]);
  if (insErr) throw insErr;

  const { error: stageErr } = await supabase
    .from('deals')
    .update({ deal_stage: 'Content Submitted' })
    .eq('id', dealId);
  if (stageErr) throw stageErr;
}

export async function approveSubmission(submissionId: string, dealId: string): Promise<void> {
  const { error: updErr } = await supabase
    .from('deal_submissions')
    .update({ status: 'approved', rejection_reason: null })
    .eq('id', submissionId);
  if (updErr) throw updErr;

  const { error: stageErr } = await supabase
    .from('deals')
    .update({ deal_stage: 'Approved', approved_at: new Date().toISOString() })
    .eq('id', dealId);
  if (stageErr) throw stageErr;
}

export async function rejectSubmission(submissionId: string, dealId: string, reason: string): Promise<void> {
  const { error: updErr } = await supabase
    .from('deal_submissions')
    .update({ status: 'rework', rejection_reason: reason })
    .eq('id', submissionId);
  if (updErr) throw updErr;

  const { error: stageErr } = await supabase
    .from('deals')
    .update({ deal_stage: 'Platform Escrow' })
    .eq('id', dealId);
  if (stageErr) throw stageErr;
}

/* Optional: list/count helpers with the same safe ordering */

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
