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

type SendDealParams = {
  senderId: string;    // auth.user.id (will be resolved to profiles.id)
  receiverId: string;  // profiles.id
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
    senderId,        // This is auth.user.id 
    receiverId,      // This is profiles.id (from PublicProfile)
    message: rawMessage,
    pricingMode,
    amount,
    currency: rawCurrency = 'USD',
  } = params;

  console.log('sendDealRequest called with:', { senderId, receiverId, message: rawMessage });

  if (!senderId || !receiverId) {
    console.error('Missing sender or receiver ID');
    return { data: null, error: new Error('Missing sender/receiver') };
  }
  
  // Basic validation
  const message = (rawMessage ?? '').trim();
  if (!message) return { data: null, error: new Error('Message is required') };

  const currency = (rawCurrency ?? 'USD').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { data: null, error: new Error('Currency must be a 3-letter ISO code') };
  }

  try {
    // ✅ FIX 1: Resolve sender's profile.id from auth user_id
    console.log('Looking up sender profile for user_id:', senderId);
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('id, role, user_id')
      .eq('user_id', senderId) // senderId is auth user ID
      .maybeSingle();
      
    if (senderError) {
      console.error('Sender profile lookup error:', senderError);
      return { data: null, error: new Error('Failed to find sender profile: ' + senderError.message) };
    }
    
    if (!senderProfile) {
      console.error('No sender profile found for user_id:', senderId);
      return { data: null, error: new Error('Sender profile not found. Please complete your profile setup.') };
    }

    console.log('Found sender profile:', senderProfile);

    // ✅ FIX 2: Verify receiver profile exists (receiverId should be profiles.id)  
    console.log('Looking up receiver profile for id:', receiverId);
    const { data: receiverProfile, error: receiverError } = await supabase
      .from('profiles')
      .select('id, role, user_id')
      .eq('id', receiverId) // receiverId is already profiles.id
      .maybeSingle();
      
    if (receiverError) {
      console.error('Receiver profile lookup error:', receiverError);
      return { data: null, error: new Error('Failed to find receiver profile: ' + receiverError.message) };
    }
    
    if (!receiverProfile) {
      console.error('No receiver profile found for id:', receiverId);
      return { data: null, error: new Error('Receiver profile not found') };
    }

    console.log('Found receiver profile:', receiverProfile);

    // ✅ FIX 3: Check that we're not sending to ourselves
    if (senderProfile.user_id === receiverProfile.user_id) {
      return { data: null, error: new Error('Cannot send a deal to yourself') };
    }

    // ✅ FIX 4: Validate opposite roles
    if (!senderProfile.role || !receiverProfile.role) {
      return { data: null, error: new Error('Both users must have assigned roles') };
    }
    
    const validRoles = ['creator', 'business'];
    if (!validRoles.includes(senderProfile.role) || !validRoles.includes(receiverProfile.role)) {
      return { data: null, error: new Error('Invalid role assignments') };
    }
    
    if (senderProfile.role === receiverProfile.role) {
      return { data: null, error: new Error('Deals can only be sent to the opposite role') };
    }

    // ✅ FIX 5: Pricing validation
    const inferredMode: PricingMode = amount != null && amount > 0 ? 'fixed' : 'negotiable';
    const effectiveMode: PricingMode = pricingMode ?? inferredMode;

    if (effectiveMode === 'fixed') {
      if (amount == null || amount <= 0) {
        return { data: null, error: new Error('Enter a valid amount for fixed offers') };
      }
    } else if (amount != null && amount > 0) {
      return { data: null, error: new Error('Negotiable offers must not include an amount') };
    }

    // ✅ FIX 6: Prepare insert with correct profile IDs
    type DealInsert = {
      sender_id: number;    // profiles.id (auto-increment)
      receiver_id: number;  // profiles.id (auto-increment) 
      message: string;
      deal_stage: DealStage;
      offer_pricing_mode: PricingMode;
      offer_currency: string;
      deal_value?: number;
    };

    const insertPayload: DealInsert = {
      sender_id: senderProfile.id,   // ✅ Use profiles.id (not user_id)
      receiver_id: receiverProfile.id, // ✅ Use profiles.id
      message,
      deal_stage: 'Waiting for Response',
      offer_pricing_mode: effectiveMode,
      offer_currency: currency,
    };
    
    if (effectiveMode === 'fixed') {
      insertPayload.deal_value = amount!;
    }

    console.log('Inserting deal with payload:', insertPayload);

    // ✅ FIX 7: Insert deal
    const { data, error } = await supabase
      .from('deals')
      .insert([insertPayload])
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Deal insert error:', error);
      return { data: null, error: new Error('Failed to create deal: ' + error.message) };
    }

    console.log('Deal created successfully:', data);
    return { data, error: null };

  } catch (err) {
    console.error('Unexpected error in sendDealRequest:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: new Error('Request failed: ' + message) };
  }
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