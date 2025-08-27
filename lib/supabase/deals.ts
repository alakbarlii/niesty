'use client';

export type PricingMode = 'fixed' | 'negotiable';
export type DealStage =
  | 'Waiting for Response'
  | 'Negotiating Terms'
  | 'Platform Escrow'
  | 'Content Submitted'
  | 'Approved'
  | 'Payment Released';

type Ok<T = unknown> = { data: T; error: null };
type Err = { data: null; error: Error };

type SendDealParams = {
  senderId: string;   // profiles.id (kept for validation in UI; API doesn’t need it)
  receiverId: string; // profiles.id
  message: string;
  pricingMode?: PricingMode;
  amount?: number | null;
  currency?: string;
};

export async function sendDealRequest(params: SendDealParams): Promise<Ok | Err> {
  const { receiverId, message, pricingMode, amount, currency = 'USD' } = params;

  const body = {
    receiver_id: receiverId,
    message,
    deal_value: pricingMode === 'fixed' && amount ? amount : null,
    offer_currency: currency,
    offer_pricing_mode: pricingMode ?? (amount && amount > 0 ? 'fixed' as const : 'negotiable' as const),
    turnstileToken: 'dev-ok', // dev bypass in your API route
  };

  const res = await fetch('/api/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: new Error(json?.error || 'Request failed') };
  return { data: json.deal ?? json, error: null };
}