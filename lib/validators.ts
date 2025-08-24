// lib/validators.ts
import { z } from 'zod'

export const MessageSchema = z.object({
  turnstileToken: z.string().nullable().optional(),
  deal_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
}).strict()

// EXACTLY what your app uses
const PricingModeEnum = z.enum(['fixed', 'negotiable'])

// Accept either `offer_amount` or `deal_value`; require one; normalize currency
export const DealSchema = z.object({
  turnstileToken: z.string().nullable().optional(),

  receiver_id: z.string().uuid(),
  message: z.string().min(1).max(5000),

  // accept either name; we’ll resolve in the route
  offer_amount: z.number().positive().max(1_000_000).optional(),
  deal_value: z.number().positive().max(1_000_000).optional(),

  offer_currency: z.string().min(3).max(3)
    .transform(s => s.toUpperCase()),
  pricing_mode: PricingModeEnum,

  agreement_terms: z.string().max(10000).optional().nullable(),
}).refine(
  d => typeof d.offer_amount === 'number' || typeof d.deal_value === 'number',
  { message: 'amount required', path: ['offer_amount'] }
).strict()