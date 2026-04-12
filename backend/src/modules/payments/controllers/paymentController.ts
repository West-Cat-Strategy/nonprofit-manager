/**
 * Payment Controller
 * HTTP handlers for payment operations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '@config/logger';
import { recurringDonationService } from '@modules/recurringDonations/services/recurringDonationService';
import { appendAuditLog } from '@services/auditService';
<<<<<<< HEAD
import paymentProviderService from '@services/paymentProviderService';
=======
import stripeService from '@services/stripeService';
>>>>>>> origin/main
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
<<<<<<< HEAD
=======
const PROVIDER_STRIPE = 'stripe';

>>>>>>> origin/main
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
<<<<<<< HEAD
  provider: string,
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
      [provider, eventId, eventType]
=======
      [PROVIDER_STRIPE, eventId, eventType]
>>>>>>> origin/main
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
<<<<<<< HEAD
  provider: string,
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
      [provider, eventId, status, errorMessage || null]
=======
      [PROVIDER_STRIPE, eventId, status, errorMessage || null]
>>>>>>> origin/main
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
<<<<<<< HEAD
    sendSuccess(res, paymentProviderService.getPaymentConfig());
=======
    sendSuccess(res, {
      stripe: {
        configured: stripeService.isStripeConfigured(),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      },
    });
>>>>>>> origin/main
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
<<<<<<< HEAD
    const provider =
      (req.body as CreatePaymentIntentRequest).provider ||
      paymentProviderService.getPaymentConfig().defaultProvider;
=======
>>>>>>> origin/main

    if (!amount || amount <= 0) {
      badRequest(res, 'Amount must be a positive number');
      return;
    }

    // Minimum amount is $0.50 (50 cents)
    if (amount < 50) {
      badRequest(res, 'Minimum amount is $0.50 (50 cents)');
      return;
    }

<<<<<<< HEAD
    const paymentIntent = await paymentProviderService.createPaymentIntent({
=======
    const paymentIntent = await stripeService.createPaymentIntent({
>>>>>>> origin/main
      amount,
      currency: currency || 'usd',
      description,
      metadata,
      donationId,
      receiptEmail,
      statementDescriptor: 'NONPROFIT DONATION',
<<<<<<< HEAD
      provider,
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
          provider,
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;
=======
>>>>>>> origin/main

    if (!id) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

<<<<<<< HEAD
    const paymentIntent = await paymentProviderService.getPaymentIntent(id, provider as any);
=======
    const paymentIntent = await stripeService.getPaymentIntent(id);
>>>>>>> origin/main
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
<<<<<<< HEAD
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;
=======
>>>>>>> origin/main

    if (!id) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

<<<<<<< HEAD
    const paymentIntent = await paymentProviderService.cancelPaymentIntent(id, provider as any);
=======
    const paymentIntent = await stripeService.cancelPaymentIntent(id);
>>>>>>> origin/main
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
<<<<<<< HEAD
    const { paymentIntentId, amount, reason, provider } = req.body as RefundRequest;
=======
    const { paymentIntentId, amount, reason } = req.body as RefundRequest;
>>>>>>> origin/main

    if (!paymentIntentId) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

<<<<<<< HEAD
    const refund = await paymentProviderService.createRefund({
      paymentIntentId,
      amount,
      reason,
      provider,
=======
    const refund = await stripeService.createRefund({
      paymentIntentId,
      amount,
      reason,
>>>>>>> origin/main
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
<<<<<<< HEAD
    const { email, name, phone, contactId, provider } = req.body as CreateCustomerRequest;
=======
    const { email, name, phone, contactId } = req.body as CreateCustomerRequest;
>>>>>>> origin/main

    if (!email) {
      badRequest(res, 'Email is required');
      return;
    }

<<<<<<< HEAD
    const customer = await paymentProviderService.createCustomer({
=======
    const customer = await stripeService.createCustomer({
>>>>>>> origin/main
      email,
      name,
      phone,
      contactId,
<<<<<<< HEAD
      provider,
    });

    // Optionally update the legacy Stripe customer reference for contact-based billing flows.
    if (pool && contactId && provider === 'stripe') {
=======
    });

    // Optionally update contact with Stripe customer ID
    if (pool && contactId) {
>>>>>>> origin/main
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
<<<<<<< HEAD
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;
=======
>>>>>>> origin/main

    if (!id) {
      badRequest(res, 'Customer ID is required');
      return;
    }

<<<<<<< HEAD
    const customer = await paymentProviderService.getCustomer(id, provider as any);
=======
    const customer = await stripeService.getCustomer(id);
>>>>>>> origin/main
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
<<<<<<< HEAD
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;
=======
>>>>>>> origin/main

    if (!customerId) {
      badRequest(res, 'Customer ID is required');
      return;
    }

<<<<<<< HEAD
    const paymentMethods = await paymentProviderService.listPaymentMethods(customerId, provider as any);
=======
    const paymentMethods = await stripeService.listPaymentMethods(customerId);
>>>>>>> origin/main
    sendSuccess(res, paymentMethods);
  } catch (error) {
    logger.error('Error listing payment methods', { error });
    serverError(res, 'Failed to list payment methods');
  }
};

<<<<<<< HEAD
const getDonationIdFromWebhookObject = (object: Record<string, unknown>): string | null => {
  const metadata = object.metadata as Record<string, unknown> | undefined;
  const customId = object.custom_id as string | undefined;
  const invoice = object.invoice as { custom_id?: string } | undefined;
  return (
    (typeof metadata?.donationId === 'string' && metadata.donationId) ||
    (typeof customId === 'string' && customId) ||
    (typeof invoice?.custom_id === 'string' && invoice.custom_id) ||
    null
  );
};

const getProviderTransactionIdFromWebhookObject = (object: Record<string, unknown>): string | null => {
  const candidates = [
    object.id,
    object.payment_intent,
    object.capture_id,
    object.payment_id,
    object.order_id,
    object.subscription_id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const persistWebhookDonationState = async (
  provider: string,
  status: 'completed' | 'failed' | 'refunded',
  object: Record<string, unknown>
): Promise<void> => {
  if (!pool) return;

  const donationId = getDonationIdFromWebhookObject(object);
  if (!donationId) return;

  const providerTransactionId = getProviderTransactionIdFromWebhookObject(object);
  const providerCheckoutSessionId =
    (object.checkout_session_id as string | undefined) ||
    (object.order_id as string | undefined) ||
    (object.id as string | undefined) ||
    providerTransactionId;
  const providerSubscriptionId =
    (object.subscription_id as string | undefined) ||
    (object.subscription as string | undefined) ||
    null;

  await pool
    .query(
      `UPDATE donations
       SET payment_status = $3,
           payment_provider = COALESCE(payment_provider, $4),
           provider_transaction_id = COALESCE(provider_transaction_id, $5),
           provider_checkout_session_id = COALESCE(provider_checkout_session_id, $6),
           provider_subscription_id = COALESCE(provider_subscription_id, $7),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        donationId,
        provider,
        status,
        provider,
        providerTransactionId,
        providerCheckoutSessionId,
        providerSubscriptionId,
      ]
    )
    .catch((err) => logger.error('Failed to update donation status', { err }));
};

/**
 * Handle provider webhooks
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  let event: WebhookEvent;
  try {
    event = await paymentProviderService.constructWebhookEvent(req.body as Buffer, req.headers);
=======
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
>>>>>>> origin/main
  } catch (error) {
    logger.warn('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    badRequest(res, 'Webhook error');
    return;
  }

<<<<<<< HEAD
=======
  // Validate webhook timestamp (reject if >5 minutes old).
>>>>>>> origin/main
  const webhookMaxAge = 5 * 60 * 1000;
  const webhookAge = Date.now() - event.created.getTime();
  if (webhookAge > webhookMaxAge) {
    logger.warn('Webhook rejected: too old', {
      eventId: event.id,
      eventType: event.type,
<<<<<<< HEAD
      provider: event.provider,
      webhookAge,
      maxAge: webhookMaxAge,
    });
=======
      webhookAge,
      maxAge: webhookMaxAge,
    });
    // Return 200 to prevent retry storms for stale payloads.
>>>>>>> origin/main
    sendProviderAck(res, { received: true, rejected: true });
    return;
  }

<<<<<<< HEAD
  const receipt = await registerPaymentWebhookReceipt(event.provider, event.id, event.type);
  if (receipt.duplicate) {
    logger.info('Duplicate payment webhook ignored', {
      eventId: event.id,
      eventType: event.type,
      provider: event.provider,
=======
  const receipt = await registerPaymentWebhookReceipt(event.id, event.type);
  if (receipt.duplicate) {
    logger.info('Duplicate Stripe webhook ignored', {
      eventId: event.id,
      eventType: event.type,
>>>>>>> origin/main
    });
    sendProviderAck(res, { received: true, duplicate: true });
    return;
  }

  try {
<<<<<<< HEAD
    logger.info('Webhook received', {
      eventType: event.type,
      eventId: event.id,
      provider: event.provider,
      age: webhookAge,
    });

    const object = event.data.object as Record<string, unknown>;

    switch (event.type) {
      case 'checkout.session.completed':
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
      case 'subscription.created':
      case 'subscription.updated': {
        await recurringDonationService.handleCheckoutSessionCompleted({
          id: getProviderTransactionIdFromWebhookObject(object) || event.id,
          customer: (object.customer as string | undefined) || null,
          subscription:
            (object.subscription as string | undefined) ||
            (object.subscription_id as string | undefined) ||
            null,
          metadata: (object.metadata as Record<string, string | undefined>) || undefined,
          provider: event.provider,
        } as any);
        break;
      }

      case 'customer.subscription.deleted':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'subscription.canceled': {
        await recurringDonationService.handleSubscriptionDeleted({
          id: getProviderTransactionIdFromWebhookObject(object) || event.id,
          customer: (object.customer as string | undefined) || null,
          metadata: (object.metadata as Record<string, string | undefined>) || undefined,
          provider: event.provider,
        } as any);
        break;
      }

      case 'payment_intent.succeeded':
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'payment.created':
      case 'payment.updated': {
        await persistWebhookDonationState(event.provider, 'completed', object);
        break;
      }

      case 'payment_intent.payment_failed':
      case 'PAYMENT.CAPTURE.DENIED': {
        await persistWebhookDonationState(event.provider, 'failed', object);
        break;
      }

      case 'charge.refunded':
      case 'PAYMENT.CAPTURE.REFUNDED':
      case 'refund.created': {
        await persistWebhookDonationState(event.provider, 'refunded', object);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'invoice.paid':
      case 'invoice.payment_failed':
      default:
        logger.debug('Unhandled webhook event type', { eventType: event.type, provider: event.provider });
    }

    await markPaymentWebhookReceiptStatus(event.provider, event.id, 'processed');
    sendProviderAck(res, { received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
    await markPaymentWebhookReceiptStatus(event.provider, event.id, 'failed', message);
    logger.error('Webhook processing failed', {
      eventId: event.id,
      eventType: event.type,
      provider: event.provider,
      error: message,
    });
=======
    logger.info('Webhook received', { eventType: event.type, eventId: event.id, age: webhookAge });

    // Handle different event types.
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string;
          customer?: string | null;
          subscription?: string | null;
          metadata?: Record<string, string | undefined>;
        };

        await recurringDonationService.handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as {
          id: string;
          customer?: string | null;
          metadata?: Record<string, string | undefined>;
        };

        await recurringDonationService.handleSubscriptionUpdated(subscription);
        break;
      }

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

      case 'customer.subscription.updated': {
        const subscription = event.data.object as {
          id: string;
          customer?: string | null;
          metadata?: Record<string, string | undefined>;
        };

        await recurringDonationService.handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as {
          id: string;
          customer?: string | null;
          metadata?: Record<string, string | undefined>;
        };

        await recurringDonationService.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as {
          id: string;
          subscription?: string | null;
          customer?: string | null;
          amount_paid: number;
          currency: string;
          payment_intent?: string | null;
          created: number;
          status_transitions?: { paid_at?: number | null };
        };

        await recurringDonationService.handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as {
          subscription?: string | null;
          customer?: string | null;
        };

        await recurringDonationService.handleInvoicePaymentFailed(invoice);
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
>>>>>>> origin/main
    sendProviderAck(res, { received: true, processingError: true });
  }
};
