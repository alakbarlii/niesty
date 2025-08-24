// lib/validators.ts
import { z } from 'zod'

export const MessageSchema = z.object({
  turnstileToken: z.string().nullable().optional(),
  deal_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
}).strict() 

export const DealSchema = z.object({
  turnstileToken: z.string().nullable().optional(),
  recipient_id: z.string().uuid(),
  message: z.string().min(1).max(5000),
  offer_amount: z.number().int().positive(),
}).strict()
