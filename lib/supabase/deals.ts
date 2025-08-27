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
type RoleRow = { id: string; role: Role | null };

type Ok = { ok: true };
type Err = { ok: false; error: Error };

type SendDealParams = {
  senderId: string;
  receiverId: string;
  message: string;
  pricingMode?: PricingMode;
  amount?: number | null;    // if fixed
  currency?: string;         // ISO-3, default USD
};

export type JsonAgreement = {
  deadline?: string; // yyyy-mm-dd preferred
  scope?: string;    // human text for deliverables/notes
};

/* ================= role helpers ================= */
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

export async function getMyRole(): Promise<Role | null> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id;
  if (!uid) return null;
  const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', uid).maybeSingle();
  return (prof?.role as Role) ?? null;
}

/* ================= sending offers ================= */
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

  const rolesCheck = await assertOppositeRoles(senderId, receiverId);
  if (!rolesCheck.ok) return { data: null, error: rolesCheck.error };

  const message = (rawMessage ?? '').trim();
  if (!message) return { data: null, error: new Error('Message is required') };

  const currency = (rawCurrency ?? 'USD').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { data: null, error: new Error('Currency must be a 3-letter ISO code') };
  }

  const inferredMode: PricingMode = amount != null && amount > 0 ? 'fixed' : 'negotiable';
  const effectiveMode: PricingMode = pricingMode ?? inferredMode;

  if (effectiveMode === 'fixed') {
    if (amount == null || amount <= 0) {
      return { data: null, error: new Error('Enter a valid amount for fixed offers') };
    }
  } else if (amount != null && amount > 0) {
    return { data: null, error: new Error('Negotiable offers must not include an amount') };
  }

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
  if (effectiveMode === 'fixed') insertPayload.deal_value = amount!;

  const { data, error } = await supabase
    .from('deals')
    .insert([insertPayload])
    .select('id')
    .maybeSingle();

  return { data, error };
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
 * Stamp current user's agreement timestamp; if both sides agreed→advance to Platform Escrow.
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

  const both =
    !!updated?.creator_agreed_at &&
    !!updated?.business_agreed_at;

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
