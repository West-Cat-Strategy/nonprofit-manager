/**
 * MODULE-OWNERSHIP: payments routes
 *
 * Route behavior for payment endpoints is owned by this module.
 * The legacy surface remains in `backend/src/routes/payments.ts` and only adapts
 * legacy v1 mounting to this route module.
 *
 * What replaced:
 * - Legacy payment routing previously resolved directly in `backend/src/routes/payments.ts`
 *   (now moved to `createPaymentsRoutes`).
 *
 * Why kept:
 * - Preserve `/api/payments` compatibility while v1 migration and policy validation are complete.
 *
 * Sunset target:
 * - P4-T1R7 / 2026-06-30 (or earlier after policy-clean migration).
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireRole } from '@middleware/permissions';
import { validateBody, validateParams } from '@middleware/zodValidation';
import * as paymentController from '../controllers';
import { emailSchema, uuidSchema } from '@validations/shared';

const router = Router();

const paymentIntentIdSchema = z.string().trim().min(1, 'Invalid payment intent ID');
const customerIdSchema = z.string().trim().min(1, 'Invalid customer ID');
const paymentProviderSchema = z.enum(['stripe', 'paypal', 'square']);

const paymentIntentIdParamsSchema = z.object({
  id: paymentIntentIdSchema,
});

const customerIdParamsSchema = z.object({
  id: customerIdSchema,
});

const paymentMethodsParamsSchema = z.object({
  customerId: customerIdSchema,
});

const createPaymentIntentSchema = z.object({
  amount: z.coerce.number().int().min(50, 'Amount must be at least 50 cents'),
  currency: z.enum(['usd', 'eur', 'gbp', 'cad', 'aud']).optional(),
  description: z.string().max(500, 'Description too long').optional(),
  donationId: uuidSchema.optional(),
  receiptEmail: emailSchema.optional(),
  provider: paymentProviderSchema.optional(),
});

const createRefundSchema = z.object({
  paymentIntentId: paymentIntentIdSchema,
  amount: z.coerce.number().int().min(1, 'Refund amount must be positive').optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  provider: paymentProviderSchema.optional(),
});

const createCustomerSchema = z.object({
  email: emailSchema,
  name: z.string().max(200, 'Name too long').optional(),
  phone: z.string().max(20, 'Phone too long').optional(),
  contactId: uuidSchema.optional(),
  provider: paymentProviderSchema.optional(),
});

/**
 * GET /api/payments/config
 * Get payment configuration (public endpoint)
 */
router.get('/config', paymentController.getPaymentConfig);

/**
 * POST /api/payments/intents
 * Create a payment intent
 */
router.post(
  '/intents',
  authenticate,
  validateBody(createPaymentIntentSchema),
  paymentController.createPaymentIntent
);

/**
 * GET /api/payments/intents/:id
 * Get payment intent status
 */
router.get(
  '/intents/:id',
  authenticate,
  validateParams(paymentIntentIdParamsSchema),
  paymentController.getPaymentIntent
);

/**
 * POST /api/payments/intents/:id/cancel
 * Cancel a payment intent
 */
router.post(
  '/intents/:id/cancel',
  authenticate,
  validateParams(paymentIntentIdParamsSchema),
  paymentController.cancelPaymentIntent
);

/**
 * POST /api/payments/refunds
 * Create a refund
 */
router.post(
  '/refunds',
  authenticate,
  requireRole('admin', 'manager', 'staff'),
  validateBody(createRefundSchema),
  paymentController.createRefund
);

/**
 * POST /api/payments/customers
 * Create a payment customer
 */
router.post(
  '/customers',
  authenticate,
  requireRole('admin', 'manager', 'staff'),
  validateBody(createCustomerSchema),
  paymentController.createCustomer
);

/**
 * GET /api/payments/customers/:id
 * Get payment customer
 */
router.get(
  '/customers/:id',
  authenticate,
  requireRole('admin', 'manager', 'staff'),
  validateParams(customerIdParamsSchema),
  paymentController.getCustomer
);

/**
 * GET /api/payments/customers/:customerId/payment-methods
 * List customer payment methods
 */
router.get(
  '/customers/:customerId/payment-methods',
  authenticate,
  requireRole('admin', 'manager', 'staff'),
  validateParams(paymentMethodsParamsSchema),
  paymentController.listPaymentMethods
);

/**
 * POST /api/payments/webhook
 * Payment webhook handler (no auth - verified by signature)
 */
router.post(
  '/webhook',
  // Note: Raw body is needed for webhook signature verification
  // This is configured in the main app
  paymentController.handleWebhook
);

export default router;

export type ResponseMode = 'v2' | 'legacy';

export const createPaymentsRoutes = (_mode: ResponseMode = 'v2') => router;

export const paymentsV2Routes = createPaymentsRoutes('v2');
