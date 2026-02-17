/**
 * Payment Routes
 * API endpoints for payment processing
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';
import * as paymentController from '@controllers/domains/operations';

const router = Router();

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
  [
    body('amount')
      .isInt({ min: 50 })
      .withMessage('Amount must be at least 50 cents'),
    body('currency')
      .optional()
      .isIn(['usd', 'eur', 'gbp', 'cad', 'aud'])
      .withMessage('Invalid currency'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description too long'),
    body('donationId')
      .optional()
      .isUUID()
      .withMessage('Invalid donation ID'),
    body('receiptEmail')
      .optional()
      .isEmail()
      .withMessage('Invalid email'),
    validateRequest,
  ],
  paymentController.createPaymentIntent
);

/**
 * GET /api/payments/intents/:id
 * Get payment intent status
 */
router.get(
  '/intents/:id',
  authenticate,
  [
    param('id')
      .isString()
      .matches(/^pi_/)
      .withMessage('Invalid payment intent ID'),
    validateRequest,
  ],
  paymentController.getPaymentIntent
);

/**
 * POST /api/payments/intents/:id/cancel
 * Cancel a payment intent
 */
router.post(
  '/intents/:id/cancel',
  authenticate,
  [
    param('id')
      .isString()
      .matches(/^pi_/)
      .withMessage('Invalid payment intent ID'),
    validateRequest,
  ],
  paymentController.cancelPaymentIntent
);

/**
 * POST /api/payments/refunds
 * Create a refund
 */
router.post(
  '/refunds',
  authenticate,
  [
    body('paymentIntentId')
      .isString()
      .matches(/^pi_/)
      .withMessage('Invalid payment intent ID'),
    body('amount')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Refund amount must be positive'),
    body('reason')
      .optional()
      .isIn(['duplicate', 'fraudulent', 'requested_by_customer'])
      .withMessage('Invalid refund reason'),
    validateRequest,
  ],
  paymentController.createRefund
);

/**
 * POST /api/payments/customers
 * Create a Stripe customer
 */
router.post(
  '/customers',
  authenticate,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('name')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Name too long'),
    body('phone')
      .optional()
      .isString()
      .isLength({ max: 20 })
      .withMessage('Phone too long'),
    body('contactId')
      .optional()
      .isUUID()
      .withMessage('Invalid contact ID'),
    validateRequest,
  ],
  paymentController.createCustomer
);

/**
 * GET /api/payments/customers/:id
 * Get Stripe customer
 */
router.get(
  '/customers/:id',
  authenticate,
  [
    param('id')
      .isString()
      .matches(/^cus_/)
      .withMessage('Invalid customer ID'),
    validateRequest,
  ],
  paymentController.getCustomer
);

/**
 * GET /api/payments/customers/:customerId/payment-methods
 * List customer payment methods
 */
router.get(
  '/customers/:customerId/payment-methods',
  authenticate,
  [
    param('customerId')
      .isString()
      .matches(/^cus_/)
      .withMessage('Invalid customer ID'),
    validateRequest,
  ],
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
