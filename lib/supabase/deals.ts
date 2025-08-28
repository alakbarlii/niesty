'use client';

import { supabase } from '@/lib/supabase';

/** Pricing modes for initial offers (NO RANGE) */
export type PricingMode = 'fixed' | 'negotiable';

export type DealStage =
  | 'Waiting for Response'
  | 'Negotiating Terms'
  | 'Platform Escrow'
  | 'Content Submitted'
  | 'Approved'
  | 'Payment Released';

type Role = 'creator' | 'business';

/* ================= role helpers ================= */
export async function getMyRole(): Promise<Role | null> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id;
  if (!uid) return null;
  const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', uid).maybeSingle();
  const r = prof?.role;
  return r === 'creator' || r === 'business' ? r : null;
}

type SendDealRequestInput = {
  receiverUserId: string;            // target's auth user id
  message: string;
  pricingMode?: PricingMode;
  amount?: number | null;            // if fixed
  currency?: string | null;          // ISO-3, default 'USD'
  turnstileToken?: string | null;    // required in production (widget), dev bypass is 'dev-ok'
  senderRoleHint: Role;              // used by API to auto-create missing sender profile
};

type SendDealSuccess = { id: string };
type SendDealResult = { data: SendDealSuccess | null; error: Error | null };

export async function sendDealRequest(input: SendDealRequestInput): Promise<SendDealResult> {
  const {
    receiverUserId,
    message: rawMessage,
    pricingMode,
    amount,
    currency,
    turnstileToken,
    senderRoleHint,
  } = input;

  if (!receiverUserId) return { data: null, error: new Error('Receiver is required') };
  const msg = (rawMessage ?? '').trim();
  if (!msg) return { data: null, error: new Error('Message is required') };

  const inferredMode: PricingMode = amount != null && amount > 0 ? 'fixed' : 'negotiable';
  const mode: PricingMode = pricingMode ?? inferredMode;

  if (mode === 'fixed') {
    if (amount == null || !Number.isFinite(amount) || amount <= 0) {
      return { data: null, error: new Error('Enter a valid amount for fixed offers') };
    }
  } else {
    if (amount != null && amount > 0) {
      return { data: null, error: new Error('Negotiable offers must not include an amount') };
    }
  }

  const curr = (currency ?? 'USD').toUpperCase();
  if (!/^[A-Z]{3}$/.test(curr)) {
    return { data: null, error: new Error('Currency must be a 3-letter ISO code') };
  }

  const inProduction = process.env.NODE_ENV === 'production';
  const hasSiteKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const payloadTurnstile =
    turnstileToken && turnstileToken.length > 0
      ? turnstileToken
      : (!inProduction || !hasSiteKey)
        ? 'dev-ok' // dev bypass (or if site key not set yet)
        : undefined;

  if (inProduction && hasSiteKey && !payloadTurnstile) {
    return { data: null, error: new Error('Verification required') };
  }

  const body = {
    receiver_id: receiverUserId,     
    message: msg,
    deal_value: mode === 'fixed' ? amount : null,
    offer_currency: curr,
    offer_pricing_mode: mode,
    sender_role_hint: senderRoleHint,
    turnstileToken: payloadTurnstile,
  };

  const res = await fetch('/api/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as
    | { deal?: { id: string }; error?: string }
    | Record<string, unknown>;

  if (!res.ok) {
    const reason = (json as { error?: string }).error || res.statusText || 'Request failed';
    return { data: null, error: new Error(reason) };
  }

  const createdId = (json as { deal?: { id: string } }).deal?.id;
  if (!createdId) return { data: null, error: new Error('Malformed response') };

  return { data: { id: createdId }, error: null };
}

/* ================= stage helpers ================= */
export async function updateDealStage(dealId: string, newStage: DealStage) {
  const { data, error } = await supabase
    .from('deals')
    .update({ deal_stage: newStage })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

export async function acceptOffer(dealId: string) {
  const { data, error } = await supabase
    .from('deals')
    .update({ accepted_at: new Date().toISOString(), deal_stage: 'Negotiating Terms' })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

/* ================= agreement (JSON terms) ================= */
export type JsonAgreement = {
  deadline?: string; // yyyy-mm-dd preferred
  scope?: string;    // human text for deliverables/notes
};

export async function saveAgreementTerms(
  dealId: string,
  params: { amount: number; deadline: string; scope?: string }
) {
  const { amount, deadline, scope = '' } = params;
  if (!Number.isFinite(amount) || amount <= 0) return { data: null, error: new Error('Invalid amount') };
  if (!deadline) return { data: null, error: new Error('Deadline required') };

  const agreement: JsonAgreement = { deadline, scope };
  const agreement_terms = JSON.stringify(agreement);

  const { data, error } = await supabase
    .from('deals')
    .update({
      agreement_terms,
      deal_value: amount,
      deal_stage: 'Negotiating Terms',
    })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();

  return { data, error };
}

/**
 * Stamp current user's agreement timestamp; if both sides agreed → advance to Platform Escrow.
 */
export async function confirmAgreementAndMaybeAdvance(dealId: string) {
  const { data: me, error: authErr } = await supabase.auth.getUser();
  if (authErr) return { data: null, error: new Error(authErr.message) };
  const uid = me?.user?.id;
  if (!uid) return { data: null, error: new Error('Not authenticated') };

  const { data: prof, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();
  if (roleErr || !prof?.role) return { data: null, error: roleErr || new Error('Role missing') };

  const patch: Record<string, string> = {};
  if (prof.role === 'creator') patch['creator_agreed_at'] = new Date().toISOString();
  if (prof.role === 'business') patch['business_agreed_at'] = new Date().toISOString();

  const { data: updated, error: updErr } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', dealId)
    .select('id, creator_agreed_at, business_agreed_at')
    .maybeSingle();
  if (updErr) return { data: null, error: updErr };

  const both = !!updated?.creator_agreed_at && !!updated?.business_agreed_at;

  if (both) {
    await supabase.from('deals').update({ deal_stage: 'Platform Escrow' }).eq('id', dealId);
  }

  return { data: updated, error: null };
}

/* ================= UI helper ================= */
export function displayOfferAmount(mode?: PricingMode | null, deal_value?: number | null) {
  if (mode === 'negotiable' || deal_value == null) return 'Negotiate';
  return deal_value;
}