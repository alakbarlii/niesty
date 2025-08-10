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
  created_at: string;
  reviewed_at: string | null;
};

export async function fetchLatestSubmission(dealId: string) {
  const { data, error } = await supabase
    .from('deal_submissions')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as DealSubmission) ?? null;
}

export async function submitSubmission(dealId: string, url: string, userId: string) {
  const { data, error } = await supabase
    .from('deal_submissions')
    .insert([{ deal_id: dealId, submitted_by: userId, url, status: 'pending' }])
    .select('*')
    .single();
  if (error) throw error;

  const { error: stageErr } = await supabase
    .from('deals')
    .update({ deal_stage: 'Content Submitted' })
    .eq('id', dealId);
  if (stageErr) throw stageErr;

  return data as DealSubmission;
}

export async function approveSubmission(submissionId: string, dealId: string) {
  const { error: updErr } = await supabase
    .from('deal_submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), rejection_reason: null })
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
    .update({ status: 'rework', reviewed_at: new Date().toISOString(), rejection_reason: reason })
    .eq('id', submissionId);
  if (updErr) throw updErr;

  const { error: stageErr } = await supabase
    .from('deals')
    .update({ deal_stage: 'Platform Escrow' })
    .eq('id', dealId);
  if (stageErr) throw stageErr;
}
