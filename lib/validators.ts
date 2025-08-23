// lib/validators.ts
import { z } from 'zod'

export const DealSchema = z.object({
  recipient_id: z.string().uuid(),
  message: z.string().min(1).max(5000),
  offer_amount: z.number().positive().max(1_000_000),
})

export const MessageSchema = z.object({
  deal_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
})
