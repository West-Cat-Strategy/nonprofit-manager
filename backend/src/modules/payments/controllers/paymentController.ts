/**
 * Payment Controller
 * HTTP handlers for payment operations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '@config/logger';
import { stripeService } from '@services/domains/operations';
import { appendAuditLog } from '@services/auditService';
import type { AuthRequest } from '@middleware/auth';
import type {
  CreatePaymentIntentRequest,
  RefundRequest,
  CreateCustomerRequest,
  WebhookEvent,
} from '@app-types/payment';
import { badRequest, serverError } from '@utils/responseHelpers';
import { sendProviderAck, sendSuccess } from '@modules/shared/http/envelope';

// Database pool
let pool: Pool;
const PROVIDER_STRIPE = 'stripe';

export const setPaymentPool = (dbPool: Pool): void => {
  pool = dbPool;
};

const isMissingTableError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '42P01';
};

const getRequestUserAgent = (req: Request): string | null => {
  const userAgent = req.headers['user-agent'];
  if (Array.isArray(userAgent)) {
    return userAgent[0] || null;
  }
  return userAgent || null;
};

const getRequestIp = (req: Request): string | null => {
  return req.ip || req.connection.remoteAddress || null;
};

const registerPaymentWebhookReceipt = async (
  eventId: string,
  eventType: string
): Promise<{ duplicate: boolean }> => {
  if (!pool) {
    return { duplicate: false };
  }

  try {
    const result = await pool.query(
      `INSERT INTO payment_webhook_receipts (provider, event_id, event_type, processing_status)
       VALUES ($1, $2, $3, 'received')
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id`,
      [PROVIDER_STRIPE, eventId, eventType]
    );
    return { duplicate: (result.rowCount ?? 0) === 0 };
  } catch (error) {
    if (isMissingTableError(error)) {
      logger.warn('payment_webhook_receipts table missing; skipping idempotency check');
      return { duplicate: false };
    }
    throw error;
  }
};

const markPaymentWebhookReceiptStatus = async (
  eventId: string,
  status: 'processed' | 'failed',
  errorMessage?: string
): Promise<void> => {
  if (!pool) return;

  try {
    await pool.query(
      `UPDATE payment_webhook_receipts
       SET processing_status = $3,
           processed_at = CASE WHEN $3 = 'processed' THEN NOW() ELSE processed_at END,
           error_message = CASE WHEN $3 = 'failed' THEN LEFT($4, 1000) ELSE NULL END
       WHERE provider = $1
         AND event_id = $2`,
      [PROVIDER_STRIPE, eventId, status, errorMessage || null]
    );
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }
    logger.warn('Failed to update payment webhook receipt status', {
      eventId,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Check if payments are configured
 */
export const getPaymentConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, {
      stripe: {
        configured: stripeService.isStripeConfigured(),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      },
    });
  } catch (error) {
    logger.error('Error getting payment config', { error });
    serverError(res, 'Failed to get payment configuration');
  }
};

/**
 * Create a payment intent
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, currency, description, metadata, donationId, receiptEmail } =
      req.body as CreatePaymentIntentRequest;

    if (!amount || amount <= 0) {
      badRequest(res, 'Amount must be a positive number');
      return;
    }

    // Minimum amount is $0.50 (50 cents)
    if (amount < 50) {
      badRequest(res, 'Minimum amount is $0.50 (50 cents)');
      return;
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency: currency || 'usd',
      description,
      metadata,
      donationId,
      receiptEmail,
      statementDescriptor: 'NONPROFIT DONATION',
    });

    // Append audit trail for mutating payment operations.
    if (pool && donationId) {
      await appendAuditLog(pool, {
        action: 'payment_intent_created',
        resourceType: 'donation',
        resourceId: donationId,
        userId: req.user?.id || null,
        details: {
          paymentIntentId: paymentIntent.id,
          amount,
          currency: currency || 'usd',
        },
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        requestId: req.correlationId,
      });
    }

    sendSuccess(res, paymentIntent, 201);
  } catch (error) {
    logger.error('Error creating payment intent', { error });
    serverError(res, 'Failed to create payment intent');
  }
};

/**
 * Get payment intent status
 */
export const getPaymentIntent = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

    const paymentIntent = await stripeService.getPaymentIntent(id);
    sendSuccess(res, paymentIntent);
  } catch (error) {
    logger.error('Error getting payment intent', { error });
    serverError(res, 'Failed to get payment intent');
  }
};

/**
 * Cancel payment intent
 */
export const cancelPaymentIntent = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

    const paymentIntent = await stripeService.cancelPaymentIntent(id);
    sendSuccess(res, paymentIntent);
  } catch (error) {
    logger.error('Error canceling payment intent', { error });
    serverError(res, 'Failed to cancel payment intent');
  }
};

/**
 * Create a refund
 */
export const createRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentIntentId, amount, reason } = req.body as RefundRequest;

    if (!paymentIntentId) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

    const refund = await stripeService.createRefund({
      paymentIntentId,
      amount,
      reason,
    });

    // Append audit trail for mutating payment operations.
    if (pool) {
      await appendAuditLog(pool, {
        action: 'refund_created',
        resourceType: 'payment',
        resourceId: paymentIntentId,
        userId: req.user?.id || null,
        details: {
          refundId: refund.id,
          amount: refund.amount,
          reason,
        },
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        requestId: req.correlationId,
      });
    }

    sendSuccess(res, refund, 201);
  } catch (error) {
    logger.error('Error creating refund', { error });
    serverError(res, 'Failed to create refund');
  }
};

/**
 * Create a customer
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, phone, contactId } = req.body as CreateCustomerRequest;

    if (!email) {
      badRequest(res, 'Email is required');
      return;
    }

    const customer = await stripeService.createCustomer({
      email,
      name,
      phone,
      contactId,
    });

    // Optionally update contact with Stripe customer ID
    if (pool && contactId) {
      await pool.query(
        `UPDATE contacts SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [customer.id, contactId]
      ).catch((err) => logger.error('Failed to update contact with Stripe customer ID', { err }));
    }

    sendSuccess(res, customer, 201);
  } catch (error) {
    logger.error('Error creating customer', { error });
    serverError(res, 'Failed to create customer');
  }
};

/**
 * Get customer
 */
export const getCustomer = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      badRequest(res, 'Customer ID is required');
      return;
    }

    const customer = await stripeService.getCustomer(id);
    sendSuccess(res, customer);
  } catch (error) {
    logger.error('Error getting customer', { error });
    serverError(res, 'Failed to get customer');
  }
};

/**
 * List customer payment methods
 */
export const listPaymentMethods = async (
  req: Request<{ customerId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      badRequest(res, 'Customer ID is required');
      return;
    }

    const paymentMethods = await stripeService.listPaymentMethods(customerId);
    sendSuccess(res, paymentMethods);
  } catch (error) {
    logger.error('Error listing payment methods', { error });
    serverError(res, 'Failed to list payment methods');
  }
};

/**
 * Handle Stripe webhook
 * 
 * Security measures:
 * - Signature verification (via stripeService.constructWebhookEvent)
 * - Timestamp validation (prevent replay attacks >5 minutes old)
 * - Idempotent event processing (via event ID)
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    badRequest(res, 'Missing stripe-signature header');
    return;
  }

  let event: WebhookEvent;
  try {
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (error) {
    logger.warn('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    badRequest(res, 'Webhook error');
    return;
  }

  // Validate webhook timestamp (reject if >5 minutes old).
  const webhookMaxAge = 5 * 60 * 1000;
  const webhookAge = Date.now() - event.created.getTime();
  if (webhookAge > webhookMaxAge) {
    logger.warn('Webhook rejected: too old', {
      eventId: event.id,
      eventType: event.type,
      webhookAge,
      maxAge: webhookMaxAge,
    });
    // Return 200 to prevent retry storms for stale payloads.
    sendProviderAck(res, { received: true, rejected: true });
    return;
  }

  const receipt = await registerPaymentWebhookReceipt(event.id, event.type);
  if (receipt.duplicate) {
    logger.info('Duplicate Stripe webhook ignored', {
      eventId: event.id,
      eventType: event.type,
    });
    sendProviderAck(res, { received: true, duplicate: true });
    return;
  }

  try {
    logger.info('Webhook received', { eventType: event.type, eventId: event.id, age: webhookAge });

    // Handle different event types.
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as { id: string; amount: number; metadata?: { donationId?: string } };
        logger.info('Payment succeeded', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
        });

        // Update donation status if linked
        if (pool && paymentIntent.metadata?.donationId) {
          await pool.query(
            `UPDATE donations
             SET payment_status = 'completed',
                 stripe_payment_intent_id = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [paymentIntent.id, paymentIntent.metadata.donationId]
          ).catch((err) => logger.error('Failed to update donation status', { err }));
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as { id: string; metadata?: { donationId?: string } };
        logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });

        // Update donation status if linked
        if (pool && paymentIntent.metadata?.donationId) {
          await pool.query(
            `UPDATE donations
             SET payment_status = 'failed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [paymentIntent.metadata.donationId]
          ).catch((err) => logger.error('Failed to update donation status', { err }));
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent: string; amount_refunded: number };
        logger.info('Charge refunded', {
          paymentIntentId: charge.payment_intent,
          amountRefunded: charge.amount_refunded,
        });
        break;
      }

      default:
        logger.debug('Unhandled webhook event type', { eventType: event.type });
    }

    await markPaymentWebhookReceiptStatus(event.id, 'processed');
    sendProviderAck(res, { received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
    await markPaymentWebhookReceiptStatus(event.id, 'failed', message);
    logger.error('Webhook processing failed', {
      eventId: event.id,
      eventType: event.type,
      error: message,
    });
    // Preserve provider stability by acknowledging verified events.
    sendProviderAck(res, { received: true, processingError: true });
  }
};
