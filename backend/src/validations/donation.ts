/**
 * Donation Validation Schemas
 * Schemas for donations, pledges, and financial tracking
 */

import { z } from 'zod';
import { uuidSchema } from './shared';

// Payment method enum
export const paymentMethodSchema = z.enum(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other']);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Payment status enum
export const paymentStatusSchema = z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Recurring frequency enum
export const recurringFrequencySchema = z.enum(['weekly', 'monthly', 'quarterly', 'annually', 'one_time']);

export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>;

// Create donation
export const createDonationSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().length(3).default('USD'),
  donation_date: z.coerce.date(),
  payment_method: paymentMethodSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  account_id: uuidSchema.optional(),
  contact_id: uuidSchema.optional(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: recurringFrequencySchema.optional(),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;

// Update donation
export const updateDonationSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  currency: z.string().length(3).optional(),
  donation_date: z.coerce.date().optional(),
  payment_method: paymentMethodSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  account_id: uuidSchema.optional(),
  contact_id: uuidSchema.optional(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: recurringFrequencySchema.optional(),
  receipt_sent: z.boolean().optional(),
});

export type UpdateDonationInput = z.infer<typeof updateDonationSchema>;

// Donation filter / query parameters
export const donationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  payment_method: paymentMethodSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  is_recurring: z.boolean().optional(),
  min_amount: z.coerce.number().nonnegative().optional(),
  max_amount: z.coerce.number().nonnegative().optional(),
});

export type DonationFilterInput = z.infer<typeof donationFilterSchema>;

// Re-export shared schemas
export { uuidSchema } from './shared';
