// lib/validators.ts
import { z } from 'zod'

export const PricingModeEnum = z.enum(['offer', 'negotiate'])

const CurrencyISO = z
  .string()
  .regex(/^[A-Z]{3}$/, 'currency must be 3 uppercase letters')

export const MessageSchema = z.object({
  turnstileToken: z.string().nullable().optional(),
  deal_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
}).strict()

export const DealSchema = z.object({
  turnstileToken: z.string().nullable().optional(),

  // EXACT final naming
  receiver_id: z.string().uuid(),
  message: z.string().min(1).max(5000),

  // money
  offer_amount: z.number().positive().max(1_000_000),
  offer_currency: CurrencyISO,

  // intent
  pricing_mode: PricingModeEnum,

  // optional
  agreement_terms: z.string().max(10000).optional().nullable(),
}).strict()