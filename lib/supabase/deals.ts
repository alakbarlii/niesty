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

type SendDealParams = {
  senderId: string;
  receiverId: string;
  message: string;

  /** Optional hint; if omitted we infer from amount. */
  pricingMode?: PricingMode;

  /** Single amount (budget). If > 0 → fixed; if null/0 → negotiable. */
  amount?: number | null;

  /** 3-letter ISO currency code (kept in DB as offer_currency). Defaults to USD. */
  currency?: string;
};

type Role = 'creator' | 'business';
type RoleRow = { id: string; role: Role | null };

type Ok = { ok: true };
type Err = { ok: false; error: Error };

/** Ensure sender/receiver roles are opposite (creator <-> business). */
async function assertOppositeRoles(senderId: string, receiverId: string): Promise<Ok | Err> {
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, role')
    .in('id', [senderId, receiverId]);

  if (error) return { ok: false, error: new Error(error.message) };
  if (!rows || rows.length < 2) return { ok: false, error: new Error('Could not load both user roles') };

  const typed = rows as RoleRow[];
  const map = new Map<string, RoleRow['role']>(typed.map((r) => [r.id, r.role]));
  const sRole = map.get(senderId);
  const rRole = map.get(receiverId);

  if (!sRole || !rRole) return { ok: false, error: new Error('Missing role for one of the users') };
  if ((sRole !== 'creator' && sRole !== 'business') || (rRole !== 'creator' && rRole !== 'business')) {
    return { ok: false, error: new Error('Unsupported role(s)') };
  }
  if (sRole === rRole) return { ok: false, error: new Error('Deals can only be sent to the opposite role') };

  return { ok: true };
}

/**
 * Create a deal request (NO RANGE, only deal_value when fixed).
 * DB columns used (must exist):
 *  - offer_pricing_mode text ('fixed'|'negotiable')
 *  - offer_currency text (3-letter ISO)
 *  - deal_stage text
 *  - deal_value numeric (ONLY set for fixed at creation)
 *  - message, sender_id, receiver_id
 */
export async function sendDealRequest(params: SendDealParams) {
  const {
    senderId,
    receiverId,
    message: rawMessage,
    pricingMode,
    amount,
    currency: rawCurrency = 'USD',
  } = params;

  if (!senderId || !receiverId) return { data: null, error: new Error('Missing sender/receiver') };
  if (senderId === receiverId) return { data: null, error: new Error('Cannot send a deal to yourself') };

  // Opposite-role check (client guard; mirror with RLS)
  const rolesCheck = await assertOppositeRoles(senderId, receiverId);
  if (!rolesCheck.ok) return { data: null, error: rolesCheck.error };

  const message = (rawMessage ?? '').trim();
  if (!message) return { data: null, error: new Error('Message is required') };

  // currency: normalize & validate
  const currency = (rawCurrency ?? 'USD').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { data: null, error: new Error('Currency must be a 3-letter ISO code') };
  }

  // Determine mode from amount unless explicitly provided
  const inferredMode: PricingMode = amount != null && amount > 0 ? 'fixed' : 'negotiable';
  const effectiveMode: PricingMode = pricingMode ?? inferredMode;

  // Validation
  if (effectiveMode === 'fixed') {
    if (amount == null || amount <= 0) {
      return { data: null, error: new Error('Enter a valid amount for fixed offers') };
    }
  } else {
    // negotiable must NOT carry an amount at creation time
    if (amount != null && amount > 0) {
      return { data: null, error: new Error('Negotiable offers must not include an amount') };
    }
  }

  // Strongly-typed insert payload
  type DealInsert = {
    sender_id: string;
    receiver_id: string;
    message: string;
    deal_stage: DealStage;
    offer_pricing_mode: PricingMode;
    offer_currency: string;
    deal_value?: number;
  };

  const insertPayload: DealInsert = {
    sender_id: senderId,
    receiver_id: receiverId,
    message,
    deal_stage: 'Waiting for Response',
    offer_pricing_mode: effectiveMode,
    offer_currency: currency,
  };

  if (effectiveMode === 'fixed') {
    insertPayload.deal_value = amount!;
  }

  const { data, error } = await supabase
    .from('deals')
    .insert([insertPayload])
    .select('id')
    .maybeSingle();

  return { data, error };
}

/** Convenience: update the human-readable stage (server should still set timestamps). */
export async function updateDealStage(dealId: string, newStage: DealStage) {
  const { data, error } = await supabase
    .from('deals')
    .update({ deal_stage: newStage })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();

  return { data, error };
}

/** Accept offer (UI helper). Prefer server route that also stamps accepted_at. */
export async function acceptOffer(dealId: string) {
  const { data, error } = await supabase
    .from('deals')
    .update({ deal_stage: 'Negotiating Terms' })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

/**
 * Set agreement draft (final price + terms) before both sides confirm.
 * Final confirmation should stamp creator_agreed_at / business_agreed_at on the server.
 */
export async function setAgreement(
  dealId: string,
  { agreementTerms, finalAmount }: { agreementTerms: string; finalAmount: number }
) {
  const { data, error } = await supabase
    .from('deals')
    .update({
      agreement_terms: agreementTerms,
      deal_value: finalAmount,
      deal_stage: 'Negotiating Terms',
    })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

/* ===================== Agreement flow helpers ===================== */

export async function acceptDeal(dealId: string) {
  const { data, error } = await supabase
    .from('deals')
    .update({
      accepted_at: new Date().toISOString(),
      deal_stage: 'Negotiating Terms',
    })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

export async function saveAgreementDraft(
  dealId: string,
  { terms, amount: finalAmount }: { terms: string; amount: number }
) {
  const { data, error } = await supabase
    .from('deals')
    .update({
      agreement_terms: terms,
      deal_value: finalAmount,
      deal_stage: 'Negotiating Terms',
    })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

export async function confirmAgreement(dealId: string) {
  const { data: me, error: authErr } = await supabase.auth.getUser();
  if (authErr) return { data: null, error: new Error(authErr.message) };
  const uid = me?.user?.id;
  if (!uid) return { data: null, error: new Error('Not authenticated') };

  const { data: myProf, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .maybeSingle();
  if (roleErr || !myProf?.role) return { data: null, error: roleErr || new Error('Role missing') };

  const myRole = myProf.role as Role;
  const patch: Record<string, string> = {};
  if (myRole === 'creator') patch['creator_agreed_at'] = new Date().toISOString();
  if (myRole === 'business') patch['business_agreed_at'] = new Date().toISOString();

  const { data, error } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', dealId)
    .select('id, creator_agreed_at, business_agreed_at')
    .maybeSingle();

  return { data, error };
}

/* ===================== UI helper ===================== */
/** Decide what to display for price on the UI list/detail. */
export function displayOfferAmount(mode?: PricingMode | null, deal_value?: number | null) {
  if (mode === 'negotiable' || deal_value == null) return 'Negotiate';
  return deal_value;
}
