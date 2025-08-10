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
  // Optional timestamp variants (schema-flexible)
  created_at?: string | null;
  submitted_at?: string | null;
  inserted_at?: string | null;
  createdAt?: string | null;
};

/** PostgREST undefined_column guard (code 42703) — no `any`. */
function isUndefinedColumn(err: unknown): err is { code: '42703' } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '42703'
  );
}

/**
 * Fetch latest submission without assuming a specific timestamp column.
 * Tries common columns; falls back to ordering by `id` if needed.
 */
export async function fetchLatestSubmission(dealId: string) {
  const orderCandidates = ['created_at', 'submitted_at', 'inserted_at', 'createdAt'] as const;

  for (const col of orderCandidates) {
    try {
      const { data, error } = await supabase
        .from('deal_submissions')
        .select('*')
        .eq('deal_id', dealId)
        .order(col, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as DealSubmission) ?? null;
    } catch (e) {
      if (isUndefinedColumn(e)) continue; // try next column
      throw e; // other errors (RLS, network, etc.) should bubble
    }
  }

  // Final fallback: order by id
  const { data, error } = await supabase
    .from('deal_submissions')
    .select('*')
    .eq('deal_id', dealId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as DealSubmission) ?? null;
}

export async function submitSubmission(dealId: string, url: string, userId: string) {
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

export async function approveSubmission(submissionId: string, dealId: string) {
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

export async function rejectSubmission(submissionId: string, dealId: string, reason: string) {
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
