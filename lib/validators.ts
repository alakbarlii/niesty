// lib/validators.ts
import { z } from 'zod';

/** UUID helper that also blocks the all-zero placeholder */
const uuidStrict = z
  .string()
  .uuid()
  .refine(
    (v) => !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(v),
    'receiver_id cannot be the all-zero placeholder'
  );

/** Messages */
export const MessageSchema = z
  .object({
    turnstileToken: z.string().nullable().optional(),
    deal_id: z.string().uuid(),
    content: z.string().min(1).max(5000),
  })
  .strict();

/** Deals – DB stores sender_id/receiver_id as auth user IDs (UUID) */
export const DealSchema = z
  .object({
    turnstileToken: z.string().nullable().optional(),

    // IMPORTANT: request body must send `receiver_id` (auth user_id)
    receiver_id: uuidStrict,

    // initial text of the offer
    message: z.string().min(1).max(5000),

    // optional pricing context
    deal_value: z.number().int().positive().optional(), // OMIT when negotiable
    offer_currency: z.string().length(3).transform((s) => s.toUpperCase()).optional(),
    offer_pricing_mode: z.enum(['fixed', 'negotiable']).optional(),

    // allow API to receive the hint without Zod failing strict() mode
    sender_role_hint: z.enum(['creator', 'business']).optional(),
  })
  .strict();
