// lib/validators.ts
import { z } from 'zod'

/**
 * Message payload (chat in a deal)
 */
export const MessageSchema = z.object({
  turnstileToken: z.string().nullable().optional(),
  deal_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
}).strict()

/**
 * Start a deal
 * - receiver_id: the other party
 * - message: initial offer text
 * - amount is optional; if present we store into deal_value
 */
export const DealStartSchema = z.object({
  turnstileToken: z.string().nullable().optional(),
  receiver_id: z.string().uuid(),
  message: z.string().min(1).max(5000),
  amount: z.number().int().positive().max(1_000_000).optional(), // optional; maps to deal_value
}).strict()