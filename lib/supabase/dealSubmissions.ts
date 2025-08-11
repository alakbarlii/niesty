'use client';

import { supabase } from '@/lib/supabase';

/** Status values used by both DB and UI */
export type SubmissionStatus = 'pending' | 'rework' | 'approved';

/** Normalized submission shape used by the app */
export type DealSubmission = {
  id: string;
  deal_id: string;
  submitted_by: string;
  url: string; // normalized from `submission_link` or `url`
  status: SubmissionStatus;
  rejection_reason: string | null;
};

const ORDER_COLUMN = 'id' as const;

/* ===== Types that represent the two possible DB shapes ===== */
type RowSubmissionLink = {
  id: string;
  deal_id: string;
  submitted_by: string;
  submission_link: string;
  status: SubmissionStatus;
  rejection_reason: string | null;
};

type RowUrl = {
  id: string;
  deal_id: string;
  submitted_by: string;
  url: string;
  status: SubmissionStatus;
  rejection_reason: string | null;
};

/** PostgREST undefined_column guard (code 42703) */
function isUndefinedColumn(err: unknown): err is { code: '42703' } {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === '42703';
}

/** Normalize a DB row (of either schema) into DealSubmission */
function normalizeRow(row: RowSubmissionLink | RowUrl | null): DealSubmission | null {
  if (!row) return null;
  // @ts-expect-error union convenience: grab whichever column exists
  const urlValue: string | undefined = row.submission_link ?? row.url;
  return {
    id: row.id,
    deal_id: row.deal_id,
    submitted_by: row.submitted_by,
    url: urlValue ?? '',
    status: row.status,
    rejection_reason: row.rejection_reason,
  };
}

/* ======================= READ ======================= */

/** Get the latest submission for a deal (works with either column schema). */
export async function fetchLatestSubmission(dealId: string): Promise<DealSubmission | null> {
  // Try schema with `submission_link`
  try {
    const { data, error } = await supabase
      .from('deal_submissions')
      .select('id, deal_id, submitted_by, submission_link, status, rejection_reason')
      .eq('deal_id', dealId)
      .order(ORDER_COLUMN, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return normalizeRow(data as RowSubmissionLink | null);
  } catch (e) {
    if (!isUndefinedColumn(e)) throw e;
    // Fallback to schema with `url`
    const { data, error } = await supabase
      .from('deal_submissions')
      .select('id, deal_id, submitted_by, url, status, rejection_reason')
      .eq('deal_id', dealId)
      .order(ORDER_COLUMN, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return normalizeRow(data as RowUrl | null);
  }
}

/* ======================= WRITE ======================= */

/**
 * Insert a new submission (creator). Moves the deal to "Content Submitted".
 * Supports both `submission_link` and `url` schemas without errors.
 */
export async function submitSubmission(dealId: string, url: string, userId: string): Promise<void> {
  // Try insert with `submission_link`
  try {
    const { error: insErr } = await supabase
      .from('deal_submissions')
      .insert([{ deal_id: dealId, submitted_by: userId, submission_link: url, status: 'pending' }]);
    if (insErr) throw insErr;
  } catch (e) {
    if (!isUndefinedColumn(e)) throw e;
    // Fallback: insert with `url`
    const { error: insErr2 } = await supabase
      .from('deal_submissions')
      .insert([{ deal_id: dealId, submitted_by: userId, url, status: 'pending' }]);
    if (insErr2) throw insErr2;
  }

  // Move deal stage to "Content Submitted"
  const { error: stageErr } = await supabase
    .from('deals')
    .update({ deal_stage: 'Content Submitted' })
    .eq('id', dealId);
  if (stageErr) throw stageErr;
}

/**
 * Approve a submission (business). Marks submission approved and moves deal to "Approved".
 * Also stamps `approved_at`.
 */
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

/**
 * Reject a submission (business). Marks submission rework(with reason) and moves deal back to "Platform Escrow".
 */
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

/* =================== OPTIONAL HELPERS =================== */

/** List a user's submissions (latest first) — works on either schema. */
export async function listSubmissionsByUser(userId: string, limit = 20): Promise<DealSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('deal_submissions')
      .select('id, deal_id, submitted_by, submission_link, status, rejection_reason')
      .eq('submitted_by', userId)
      .order(ORDER_COLUMN, { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = (data as RowSubmissionLink[]) || [];
    return rows.map((r) => normalizeRow(r)!) as DealSubmission[];
  } catch (e) {
    if (!isUndefinedColumn(e)) throw e;
    const { data, error } = await supabase
      .from('deal_submissions')
      .select('id, deal_id, submitted_by, url, status, rejection_reason')
      .eq('submitted_by', userId)
      .order(ORDER_COLUMN, { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = (data as RowUrl[]) || [];
    return rows.map((r) => normalizeRow(r)!) as DealSubmission[];
  }
}

/** Count a user's submissions. */
export async function countSubmissionsByUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('deal_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId);
  if (error) throw error;
  return count ?? 0;
}
