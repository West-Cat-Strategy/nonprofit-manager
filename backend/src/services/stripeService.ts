/**
 * Stripe Payment Service
 * Handles payment processing through Stripe
 */

import Stripe from 'stripe';
import { logger } from '../config/logger';
import type {
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  RefundRequest,
  RefundResponse,
  CreateCustomerRequest,
  CustomerResponse,
  PaymentMethodInfo,
  WebhookEvent,
  CreateSubscriptionRequest,
  SubscriptionResponse,
} from '../types/payment';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | null = null;

/**
 * Get or initialize Stripe client
 */
function getStripeClient(): Stripe {
  if (!stripe) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(stripeSecretKey);
  }
  return stripe;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!stripeSecretKey;
}

/**
 * Create a payment intent for one-time payment
 */
export async function createPaymentIntent(
  request: CreatePaymentIntentRequest
): Promise<PaymentIntentResponse> {
  const client = getStripeClient();

  try {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: request.amount,
      currency: request.currency || 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...request.metadata,
        ...(request.donationId && { donationId: request.donationId }),
      },
    };

    if (request.description) {
      params.description = request.description;
    }

    if (request.customerId) {
      params.customer = request.customerId;
    }

    if (request.receiptEmail) {
      params.receipt_email = request.receiptEmail;
    }

    if (request.statementDescriptor) {
      params.statement_descriptor_suffix = request.statementDescriptor.substring(0, 22);
    }

    const paymentIntent = await client.paymentIntents.create(params);

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as PaymentIntentResponse['status'],
      created: new Date(paymentIntent.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to create payment intent', { error, request });
    throw error;
  }
}

/**
 * Retrieve payment intent status
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
  const client = getStripeClient();

  try {
    const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as PaymentIntentResponse['status'],
      created: new Date(paymentIntent.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to retrieve payment intent', { error, paymentIntentId });
    throw error;
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
  const client = getStripeClient();

  try {
    const paymentIntent = await client.paymentIntents.cancel(paymentIntentId);

    logger.info('Payment intent canceled', { paymentIntentId });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as PaymentIntentResponse['status'],
      created: new Date(paymentIntent.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to cancel payment intent', { error, paymentIntentId });
    throw error;
  }
}

/**
 * Create a refund
 */
export async function createRefund(request: RefundRequest): Promise<RefundResponse> {
  const client = getStripeClient();

  try {
    const params: Stripe.RefundCreateParams = {
      payment_intent: request.paymentIntentId,
    };

    if (request.amount) {
      params.amount = request.amount;
    }

    if (request.reason) {
      params.reason = request.reason;
    }

    const refund = await client.refunds.create(params);

    logger.info('Refund created', {
      refundId: refund.id,
      paymentIntentId: request.paymentIntentId,
      amount: refund.amount,
    });

    return {
      id: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status as RefundResponse['status'],
      paymentIntentId: request.paymentIntentId,
      reason: refund.reason || undefined,
      created: new Date(refund.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to create refund', { error, request });
    throw error;
  }
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
  const client = getStripeClient();

  try {
    const params: Stripe.CustomerCreateParams = {
      email: request.email,
      metadata: {
        ...request.metadata,
        ...(request.contactId && { contactId: request.contactId }),
      },
    };

    if (request.name) {
      params.name = request.name;
    }

    if (request.phone) {
      params.phone = request.phone;
    }

    const customer = await client.customers.create(params);

    logger.info('Customer created', { customerId: customer.id, email: customer.email });

    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      created: new Date(customer.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to create customer', { error, request });
    throw error;
  }
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId: string): Promise<CustomerResponse> {
  const client = getStripeClient();

  try {
    const customer = await client.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error('Customer has been deleted');
    }

    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      created: new Date(customer.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to retrieve customer', { error, customerId });
    throw error;
  }
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
  const client = getStripeClient();

  try {
    const paymentMethods = await client.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type as PaymentMethodInfo['type'],
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
    }));
  } catch (error) {
    logger.error('Failed to list payment methods', { error, customerId });
    throw error;
  }
}

/**
 * Create a subscription for recurring donations
 */
export async function createSubscription(
  request: CreateSubscriptionRequest
): Promise<SubscriptionResponse> {
  const client = getStripeClient();

  try {
    const params: Stripe.SubscriptionCreateParams = {
      customer: request.customerId,
      items: [{ price: request.priceId }],
      metadata: request.metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (request.paymentMethodId) {
      params.default_payment_method = request.paymentMethodId;
    }

    const subscription = await client.subscriptions.create(params);

    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    // Access subscription properties safely
    const sub = subscription as unknown as {
      id: string;
      customer: string;
      status: string;
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      created: number;
    };

    return {
      id: sub.id,
      customerId: sub.customer,
      status: sub.status as SubscriptionResponse['status'],
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      created: new Date(sub.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to create subscription', { error, request });
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<SubscriptionResponse> {
  const client = getStripeClient();

  try {
    let subscription: Stripe.Subscription;

    if (cancelAtPeriodEnd) {
      subscription = await client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      subscription = await client.subscriptions.cancel(subscriptionId);
    }

    // Access subscription properties safely
    const sub = subscription as unknown as {
      id: string;
      customer: string;
      status: string;
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      created: number;
    };

    logger.info('Subscription canceled', {
      subscriptionId: sub.id,
      cancelAtPeriodEnd,
    });

    return {
      id: sub.id,
      customerId: sub.customer,
      status: sub.status as SubscriptionResponse['status'],
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      created: new Date(sub.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to cancel subscription', { error, subscriptionId });
    throw error;
  }
}

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): WebhookEvent {
  const client = getStripeClient();

  if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  try {
    const event = client.webhooks.constructEvent(payload, signature, stripeWebhookSecret);

    return {
      id: event.id,
      type: event.type as WebhookEvent['type'],
      data: event.data as unknown as WebhookEvent['data'],
      created: new Date(event.created * 1000),
      livemode: event.livemode,
    };
  } catch (error) {
    logger.error('Webhook signature verification failed', { error });
    throw error;
  }
}

export default {
  isStripeConfigured,
  createPaymentIntent,
  getPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  createCustomer,
  getCustomer,
  listPaymentMethods,
  createSubscription,
  cancelSubscription,
  constructWebhookEvent,
};
