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

  /** Only 'fixed' or 'negotiable'. Ignored in logic; amount decides. */
  pricingMode?: PricingMode;

  /** Single amount (budget). If provided > 0 → fixed. */
  amount?: number | null;

  /** Back-compat: treat legacy amountMin as amount. */
  amountMin?: number | null;

  /** ISO currency; defaults to USD */
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
 * Create a deal request (NO RANGE in DB).
 * DB columns used:
 *  - offer_pricing_mode text ('fixed'|'negotiable')
 *  - offer_amount_min numeric  (single amount when fixed)
 *  - offer_amount_max numeric  (ALWAYS NULL)
 *  - offer_currency text
 *  - deal_stage text
 */
export async function sendDealRequest(params: SendDealParams) {
  const {
    senderId,
    receiverId,
    message: rawMessage,
    amount,
    amountMin, // back-compat
    currency: rawCurrency = 'USD',
  } = params;

  if (!senderId || !receiverId) return { data: null, error: new Error('Missing sender/receiver') };
  if (senderId === receiverId) return { data: null, error: new Error('Cannot send a deal to yourself') };

  // Opposite-role check (client guard; mirror with RLS on DB)
  const rolesCheck = await assertOppositeRoles(senderId, receiverId);
  if (!rolesCheck.ok) return { data: null, error: rolesCheck.error };

  const message = (rawMessage ?? '').trim();
  if (!message) return { data: null, error: new Error('Message is required') };

  const currency = (rawCurrency ?? 'USD').toUpperCase();
  if (currency.length !== 3) return { data: null, error: new Error('Currency must be a 3-letter ISO code') };

  // Single amount (prefer amount; fallback to legacy amountMin)
  const singleAmount = amount ?? amountMin ?? null;

  // Effective 2-mode logic (no range):
  // - If we have a positive amount => fixed
  // - Else => negotiable
  const effectiveMode: PricingMode = singleAmount != null && singleAmount > 0 ? 'fixed' : 'negotiable';

  // Validation
  if (effectiveMode === 'fixed') {
    if (singleAmount == null || singleAmount <= 0) {
      return { data: null, error: new Error('Enter a valid amount') };
    }
  } else {
    // negotiable must NOT carry an amount
    if (singleAmount != null) {
      return { data: null, error: new Error('Negotiable offers must not include an amount') };
    }
  }

  // Map to DB fields (no ranges)
  const offer_amount_min = effectiveMode === 'fixed' ? singleAmount : null;
  const offer_amount_max = null;

  const { data, error } = await supabase
    .from('deals')
    .insert([
      {
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        deal_stage: 'Waiting for Response' as DealStage,
        offer_pricing_mode: effectiveMode,
        offer_amount_min,
        offer_amount_max,
        offer_currency: currency,
      },
    ])
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
