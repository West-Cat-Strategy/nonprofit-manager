/**
 * Payment Routes
 * API endpoints for payment processing
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams } from '@middleware/zodValidation';
import * as paymentController from '@controllers/domains/operations';
import { uuidSchema } from '@validations/shared';

const router = Router();

const paymentIntentIdSchema = z.string().regex(/^pi_/, 'Invalid payment intent ID');
const customerIdSchema = z.string().regex(/^cus_/, 'Invalid customer ID');

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
  receiptEmail: z.string().email('Invalid email').optional(),
});

const createRefundSchema = z.object({
  paymentIntentId: paymentIntentIdSchema,
  amount: z.coerce.number().int().min(1, 'Refund amount must be positive').optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

const createCustomerSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().max(200, 'Name too long').optional(),
  phone: z.string().max(20, 'Phone too long').optional(),
  contactId: uuidSchema.optional(),
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
router.post('/intents', authenticate, validateBody(createPaymentIntentSchema), paymentController.createPaymentIntent);

/**
 * GET /api/payments/intents/:id
 * Get payment intent status
 */
router.get('/intents/:id', authenticate, validateParams(paymentIntentIdParamsSchema), paymentController.getPaymentIntent);

/**
 * POST /api/payments/intents/:id/cancel
 * Cancel a payment intent
 */
router.post('/intents/:id/cancel', authenticate, validateParams(paymentIntentIdParamsSchema), paymentController.cancelPaymentIntent);

/**
 * POST /api/payments/refunds
 * Create a refund
 */
router.post('/refunds', authenticate, validateBody(createRefundSchema), paymentController.createRefund);

/**
 * POST /api/payments/customers
 * Create a Stripe customer
 */
router.post('/customers', authenticate, validateBody(createCustomerSchema), paymentController.createCustomer);

/**
 * GET /api/payments/customers/:id
 * Get Stripe customer
 */
router.get('/customers/:id', authenticate, validateParams(customerIdParamsSchema), paymentController.getCustomer);

/**
 * GET /api/payments/customers/:customerId/payment-methods
 * List customer payment methods
 */
router.get(
  '/customers/:customerId/payment-methods',
  authenticate,
  validateParams(paymentMethodsParamsSchema),
  paymentController.listPaymentMethods
);

/**
 * POST /api/payments/webhook
 * Stripe webhook handler (no auth - verified by signature)
 */
router.post(
  '/webhook',
  // Note: Raw body is needed for webhook signature verification
  // This is configured in the main app
  paymentController.handleWebhook
);

export default router;
