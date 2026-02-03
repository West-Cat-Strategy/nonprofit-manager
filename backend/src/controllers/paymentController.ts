/**
 * Payment Controller
 * HTTP handlers for payment operations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '../config/logger';
import * as stripeService from '../services/stripeService';
import type { AuthRequest } from '../middleware/auth';
import type {
  CreatePaymentIntentRequest,
  RefundRequest,
  CreateCustomerRequest,
} from '../types/payment';

// Database pool
let pool: Pool;

export const setPaymentPool = (dbPool: Pool): void => {
  pool = dbPool;
};

/**
 * Check if payments are configured
 */
export const getPaymentConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      stripe: {
        configured: stripeService.isStripeConfigured(),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      },
    });
  } catch (error) {
    logger.error('Error getting payment config', { error });
    res.status(500).json({ error: 'Failed to get payment configuration' });
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
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    // Minimum amount is $0.50 (50 cents)
    if (amount < 50) {
      res.status(400).json({ error: 'Minimum amount is $0.50 (50 cents)' });
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

    // Optionally log to audit table
    if (pool && donationId) {
      await pool.query(
        `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'payment_intent_created',
          'donation',
          donationId,
          req.user?.id || null,
          JSON.stringify({ paymentIntentId: paymentIntent.id, amount }),
        ]
      ).catch((err) => logger.error('Failed to log payment intent creation', { err }));
    }

    res.status(201).json(paymentIntent);
  } catch (error) {
    logger.error('Error creating payment intent', { error });
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

/**
 * Get payment intent status
 */
export const getPaymentIntent = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Payment intent ID is required' });
      return;
    }

    const paymentIntent = await stripeService.getPaymentIntent(id);
    res.json(paymentIntent);
  } catch (error) {
    logger.error('Error getting payment intent', { error });
    res.status(500).json({ error: 'Failed to get payment intent' });
  }
};

/**
 * Cancel payment intent
 */
export const cancelPaymentIntent = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Payment intent ID is required' });
      return;
    }

    const paymentIntent = await stripeService.cancelPaymentIntent(id);
    res.json(paymentIntent);
  } catch (error) {
    logger.error('Error canceling payment intent', { error });
    res.status(500).json({ error: 'Failed to cancel payment intent' });
  }
};

/**
 * Create a refund
 */
export const createRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentIntentId, amount, reason } = req.body as RefundRequest;

    if (!paymentIntentId) {
      res.status(400).json({ error: 'Payment intent ID is required' });
      return;
    }

    const refund = await stripeService.createRefund({
      paymentIntentId,
      amount,
      reason,
    });

    // Log refund to audit
    if (pool) {
      await pool.query(
        `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'refund_created',
          'payment',
          paymentIntentId,
          req.user?.id || null,
          JSON.stringify({ refundId: refund.id, amount: refund.amount, reason }),
        ]
      ).catch((err) => logger.error('Failed to log refund creation', { err }));
    }

    res.status(201).json(refund);
  } catch (error) {
    logger.error('Error creating refund', { error });
    res.status(500).json({ error: 'Failed to create refund' });
  }
};

/**
 * Create a customer
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, phone, contactId } = req.body as CreateCustomerRequest;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
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

    res.status(201).json(customer);
  } catch (error) {
    logger.error('Error creating customer', { error });
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

/**
 * Get customer
 */
export const getCustomer = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Customer ID is required' });
      return;
    }

    const customer = await stripeService.getCustomer(id);
    res.json(customer);
  } catch (error) {
    logger.error('Error getting customer', { error });
    res.status(500).json({ error: 'Failed to get customer' });
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
      res.status(400).json({ error: 'Customer ID is required' });
      return;
    }

    const paymentMethods = await stripeService.listPaymentMethods(customerId);
    res.json(paymentMethods);
  } catch (error) {
    logger.error('Error listing payment methods', { error });
    res.status(500).json({ error: 'Failed to list payment methods' });
  }
};

/**
 * Handle Stripe webhook
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    const event = stripeService.constructWebhookEvent(req.body, signature);

    logger.info('Webhook received', { eventType: event.type, eventId: event.id });

    // Handle different event types
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

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error });
    res.status(400).json({ error: 'Webhook error' });
  }
};
