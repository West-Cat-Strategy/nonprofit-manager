/**
 * Payment Controller
 * HTTP handlers for payment operations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '@config/logger';
import { recurringDonationService } from '@modules/recurringDonations/services/recurringDonationService';
import { sendError, sendProviderAck, sendSuccess } from '@modules/shared/http/envelope';
import { appendAuditLog } from '@services/auditService';
import { requireActiveOrganizationSafe } from '@services/authGuardService';
import paymentProviderService from '@services/paymentProviderService';
import type { AuthRequest } from '@middleware/auth';
import type {
  CreatePaymentIntentRequest,
  RefundRequest,
  CreateCustomerRequest,
  WebhookEvent,
} from '@app-types/payment';
import { badRequest, notFoundMessage, serverError } from '@utils/responseHelpers';

// Database pool
let pool: Pool;
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

const isNotFoundProviderError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === 'not_found' || code === 'resource_missing';
};

const hasPaymentIntentOwnership = async (
  organizationId: string,
  provider: string,
  paymentIntentId: string
): Promise<boolean> => {
  if (!pool) {
    logger.error('Payment pool not initialized while checking payment intent ownership', {
      paymentIntentId,
      provider,
      organizationId,
    });
    return false;
  }

  const result = await pool.query<{ donation_id: string }>(
    `SELECT d.id as donation_id
     FROM donations d
     WHERE d.account_id = $1
       AND d.payment_provider = $2
       AND (
         d.provider_transaction_id = $3
         OR d.provider_checkout_session_id = $3
         OR d.transaction_id = $3
       )
     LIMIT 1`,
    [organizationId, provider, paymentIntentId]
  );

  return (result.rowCount ?? 0) > 0;
};

const resolvePaymentIntentAccess = async (
  req: AuthRequest,
  res: Response,
  paymentIntentId: string,
  provider: string,
  failureMessage: string
): Promise<{ organizationId: string } | null> => {
  const organizationResult = await requireActiveOrganizationSafe(req);
  if (!organizationResult.ok) {
    sendError(
      res,
      organizationResult.error.code.toUpperCase(),
      organizationResult.error.message,
      organizationResult.error.statusCode,
      undefined,
      req.correlationId
    );
    return null;
  }

  try {
    const ownsPaymentIntent = await hasPaymentIntentOwnership(
      organizationResult.data.organizationId,
      provider,
      paymentIntentId
    );

    if (!ownsPaymentIntent) {
      notFoundMessage(res, 'Payment intent not found');
      return null;
    }
  } catch (error) {
    logger.error('Error verifying payment intent ownership', {
      error,
      paymentIntentId,
      provider,
      organizationId: organizationResult.data.organizationId,
    });
    serverError(res, failureMessage);
    return null;
  }

  return { organizationId: organizationResult.data.organizationId };
};

const registerPaymentWebhookReceipt = async (
  provider: string,
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
      [provider, eventId, eventType]
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
  provider: string,
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
      [provider, eventId, status, errorMessage || null]
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
    sendSuccess(res, paymentProviderService.getPaymentConfig());
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
    const provider =
      (req.body as CreatePaymentIntentRequest).provider ||
      paymentProviderService.getPaymentConfig().defaultProvider;

    if (!amount || amount <= 0) {
      badRequest(res, 'Amount must be a positive number');
      return;
    }

    // Minimum amount is $0.50 (50 cents)
    if (amount < 50) {
      badRequest(res, 'Minimum amount is $0.50 (50 cents)');
      return;
    }

    const paymentIntent = await paymentProviderService.createPaymentIntent({
      amount,
      currency: currency || 'usd',
      description,
      metadata,
      donationId,
      receiptEmail,
      statementDescriptor: 'NONPROFIT DONATION',
      provider,
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
          provider,
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
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;

    if (!id) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

    const access = await resolvePaymentIntentAccess(
      req as AuthRequest,
      res,
      id,
      provider,
      'Failed to get payment intent'
    );
    if (!access) {
      return;
    }

    const paymentIntent = await paymentProviderService.getPaymentIntent(id, provider as any);
    sendSuccess(res, paymentIntent);
  } catch (error) {
    if (isNotFoundProviderError(error)) {
      notFoundMessage(res, 'Payment intent not found');
      return;
    }
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
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;

    if (!id) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

    const access = await resolvePaymentIntentAccess(
      req as AuthRequest,
      res,
      id,
      provider,
      'Failed to cancel payment intent'
    );
    if (!access) {
      return;
    }

    const paymentIntent = await paymentProviderService.cancelPaymentIntent(id, provider as any);
    sendSuccess(res, paymentIntent);
  } catch (error) {
    if (isNotFoundProviderError(error)) {
      notFoundMessage(res, 'Payment intent not found');
      return;
    }
    logger.error('Error canceling payment intent', { error });
    serverError(res, 'Failed to cancel payment intent');
  }
};

/**
 * Create a refund
 */
export const createRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentIntentId, amount, reason, provider } = req.body as RefundRequest;

    if (!paymentIntentId) {
      badRequest(res, 'Payment intent ID is required');
      return;
    }

    const refund = await paymentProviderService.createRefund({
      paymentIntentId,
      amount,
      reason,
      provider,
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
    if (isNotFoundProviderError(error)) {
      notFoundMessage(res, 'Refund target not found');
      return;
    }
    logger.error('Error creating refund', { error });
    serverError(res, 'Failed to create refund');
  }
};

/**
 * Create a customer
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, phone, contactId, provider } = req.body as CreateCustomerRequest;

    if (!email) {
      badRequest(res, 'Email is required');
      return;
    }

    const customer = await paymentProviderService.createCustomer({
      email,
      name,
      phone,
      contactId,
      provider,
    });

    // Optionally update the legacy Stripe customer reference for contact-based billing flows.
    if (pool && contactId && provider === 'stripe') {
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
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;

    if (!id) {
      badRequest(res, 'Customer ID is required');
      return;
    }

    const customer = await paymentProviderService.getCustomer(id, provider as any);
    sendSuccess(res, customer);
  } catch (error) {
    if (isNotFoundProviderError(error)) {
      notFoundMessage(res, 'Customer not found');
      return;
    }
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
    const provider =
      typeof req.query.provider === 'string'
        ? req.query.provider
        : paymentProviderService.getPaymentConfig().defaultProvider;

    if (!customerId) {
      badRequest(res, 'Customer ID is required');
      return;
    }

    const paymentMethods = await paymentProviderService.listPaymentMethods(customerId, provider as any);
    sendSuccess(res, paymentMethods);
  } catch (error) {
    if (isNotFoundProviderError(error)) {
      notFoundMessage(res, 'Customer payment methods not found');
      return;
    }
    logger.error('Error listing payment methods', { error });
    serverError(res, 'Failed to list payment methods');
  }
};

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
  } catch (error) {
    logger.warn('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    badRequest(res, 'Webhook error');
    return;
  }

  const webhookAge = Date.now() - event.created.getTime();

  const receipt = await registerPaymentWebhookReceipt(event.provider, event.id, event.type);
  if (receipt.duplicate) {
    logger.info('Duplicate payment webhook ignored', {
      eventId: event.id,
      eventType: event.type,
      provider: event.provider,
    });
    sendProviderAck(res, { received: true, duplicate: true });
    return;
  }

  try {
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
    sendProviderAck(res, { received: true, processingError: true });
  }
};
