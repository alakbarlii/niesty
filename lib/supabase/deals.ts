'use client';

import { supabase } from '@/lib/supabase';

/** Pricing modes for initial offers */
export type PricingMode = 'fixed' | 'range' | 'negotiable';

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
  /** Optional: defaults to 'negotiable' if you haven't wired the pricing UI yet */
  pricingMode?: PricingMode;
  /** Required when pricingMode === 'fixed' or 'range' */
  amountMin?: number | null;
  /** Required when pricingMode === 'range' */
  amountMax?: number | null;
  /** ISO currency; defaults to USD for MVP */
  currency?: string;
};

type RoleRow = { id: string; role: 'creator' | 'business' | null };

/** Ensure sender/receiver roles are opposite (creator <-> business). */
async function assertOppositeRoles(senderId: string, receiverId: string) {
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, role')
    .in('id', [senderId, receiverId]);

  if (error) return { ok: false as const, error };
  if (!rows || rows.length < 2) {
    return { ok: false as const, error: new Error('Could not load both user roles') };
  }

  const typed = rows as RoleRow[];
  const map = new Map<string, RoleRow['role']>(typed.map((r) => [r.id, r.role]));
  const sRole = map.get(senderId);
  const rRole = map.get(receiverId);

  if (!sRole || !rRole) {
    return { ok: false as const, error: new Error('Missing role for one of the users') };
  }
  if ((sRole !== 'creator' && sRole !== 'business') || (rRole !== 'creator' && rRole !== 'business')) {
    return { ok: false as const, error: new Error('Unsupported role(s)') };
  }
  if (sRole === rRole) {
    return { ok: false as const, error: new Error('Deals can only be sent to the opposite role') };
  }

  return { ok: true as const };
}

/**
 * Create a deal request with pricing intent stored separately from final agreement.
 * DB must have:
 *  - offer_pricing_mode text ('fixed'|'range'|'negotiable')
 *  - offer_amount_min numeric
 *  - offer_amount_max numeric
 *  - offer_currency text
 *  - deal_stage text
 */
export async function sendDealRequest(params: SendDealParams) {
  const {
    senderId,
    receiverId,
    message,
    pricingMode = 'negotiable',
    amountMin,
    amountMax,
    currency = 'USD',
  } = params;

  if (!senderId || !receiverId) return { data: null, error: new Error('Missing sender/receiver') };
  if (senderId === receiverId) return { data: null, error: new Error('Cannot send a deal to yourself') };

  // Opposite-role check (client guard; RLS should mirror this)
  const rolesCheck = await assertOppositeRoles(senderId, receiverId);
  if (!rolesCheck.ok) return { data: null, error: rolesCheck.error };

  // Pricing validation
  if (pricingMode === 'fixed') {
    if (amountMin == null || amountMin <= 0) {
      return { data: null, error: new Error('Enter a valid fixed amount') };
    }
  }
  if (pricingMode === 'range') {
    if (
      amountMin == null ||
      amountMax == null ||
      amountMin <= 0 ||
      amountMax <= 0 ||
      amountMin > amountMax
    ) {
      return { data: null, error: new Error('Enter a valid price range (min ≤ max)') };
    }
  }

  // Normalize to DB fields
  const offer_amount_min =
    pricingMode === 'fixed' ? (amountMin ?? null) : pricingMode === 'range' ? (amountMin ?? null) : null;
  const offer_amount_max =
    pricingMode === 'fixed' ? (amountMin ?? null) : pricingMode === 'range' ? (amountMax ?? null) : null;

  const { data, error } = await supabase
    .from('deals')
    .insert([
      {
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        deal_stage: 'Waiting for Response' as DealStage,
        offer_pricing_mode: pricingMode,
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

/* ===================== ADDED: Agreement flow helpers ===================== */

/** Waiting → Negotiating (stamps accepted_at and updates stage) */
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

/** Save draft agreement (terms + amount) during Negotiating */
export async function saveAgreementDraft(
  dealId: string,
  { terms, amount }: { terms: string; amount: number }
) {
  const { data, error } = await supabase
    .from('deals')
    .update({
      agreement_terms: terms,
      deal_value: amount,
      deal_stage: 'Negotiating Terms',
    })
    .eq('id', dealId)
    .select('id')
    .maybeSingle();
  return { data, error };
}

/** Confirm agreement for the current user (creator or business). When both confirm, you're escrow-ready. */
export async function confirmAgreement(dealId: string) {
  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id;
  if (!uid) return { data: null, error: new Error('Not authenticated') };

  // Determine user's role
  const { data: myProf, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .maybeSingle();
  if (roleErr || !myProf?.role) return { data: null, error: roleErr || new Error('Role missing') };

  const myRole = myProf.role as 'creator' | 'business';
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
