/**
 * Stripe Payment Service
 * Handles payment processing through Stripe
 */

import Stripe from 'stripe';
import type * as StripeCore from 'stripe/cjs/stripe.core.js';
import { logger } from '@config/logger';
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
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  CreateMonthlyPriceRequest,
  StripePriceResponse,
  BillingPortalSessionResponse,
} from '@app-types/payment';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: StripeCore.Stripe | null = null;

type StripeResourceWithId = {
  id?: string | null;
};

const getStripeId = (value: string | StripeResourceWithId | null): string | null => {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
};

type StripeErrorContext = {
  name?: string;
  message?: string;
  type?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
};

const summarizeStripeError = (error: unknown): StripeErrorContext => {
  if (error instanceof Error) {
    const stripeError = error as Error & {
      type?: string;
      code?: string;
      statusCode?: number;
      requestId?: string;
    };
    return {
      name: stripeError.name,
      message: stripeError.message,
      type: stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
      requestId: stripeError.requestId,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
  };
};

const summarizeRequestMetadataKeys = (metadata?: Record<string, unknown>): string[] =>
  metadata ? Object.keys(metadata) : [];

const summarizePaymentIntentRequest = (request: CreatePaymentIntentRequest): Record<string, unknown> => ({
  amount: request.amount,
  currency: request.currency || 'usd',
  customerId: request.customerId || null,
  donationId: request.donationId || null,
  hasDescription: Boolean(request.description),
  hasReceiptEmail: Boolean(request.receiptEmail),
  metadataKeys: summarizeRequestMetadataKeys(request.metadata),
});

const summarizeRefundRequest = (request: RefundRequest): Record<string, unknown> => ({
  paymentIntentId: request.paymentIntentId,
  amount: request.amount ?? null,
  reason: request.reason ?? null,
});

const summarizeCustomerRequest = (request: CreateCustomerRequest): Record<string, unknown> => ({
  contactId: request.contactId || null,
  hasEmail: Boolean(request.email),
  hasName: Boolean(request.name),
  hasPhone: Boolean(request.phone),
  metadataKeys: summarizeRequestMetadataKeys(request.metadata),
});

const summarizeMonthlyPriceRequest = (request: CreateMonthlyPriceRequest): Record<string, unknown> => ({
  amount: request.amount,
  currency: request.currency,
  productId: request.productId || null,
  hasProductName: Boolean(request.productName),
  metadataKeys: summarizeRequestMetadataKeys(request.metadata),
});

const summarizeSubscriptionRequest = (request: CreateSubscriptionRequest): Record<string, unknown> => ({
  customerId: request.customerId,
  priceId: request.priceId,
  hasPaymentMethod: Boolean(request.paymentMethodId),
  metadataKeys: summarizeRequestMetadataKeys(request.metadata),
});

const summarizeCheckoutSessionRequest = (
  request: CreateCheckoutSessionRequest
): Record<string, unknown> => ({
  customerId: request.customerId,
  priceId: request.priceId,
  metadataKeys: summarizeRequestMetadataKeys(request.metadata),
});

const mapSubscription = (subscription: StripeCore.Stripe.Subscription): SubscriptionResponse => {
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
    provider: 'stripe',
    customerId: sub.customer,
    status: sub.status as SubscriptionResponse['status'],
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    created: new Date(sub.created * 1000),
    providerSubscriptionId: sub.id,
  };
};

/**
 * Get or initialize Stripe client
 */
function getStripeClient(): StripeCore.Stripe {
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
    const params: StripeCore.Stripe.PaymentIntentCreateParams = {
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
      provider: 'stripe',
      clientSecret: paymentIntent.client_secret!,
      checkoutUrl: null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as PaymentIntentResponse['status'],
      created: new Date(paymentIntent.created * 1000),
      providerTransactionId: paymentIntent.id,
      providerCheckoutSessionId: paymentIntent.id,
    };
  } catch (error) {
    logger.error('Failed to create payment intent', {
      error: summarizeStripeError(error),
      request: summarizePaymentIntentRequest(request),
    });
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
      provider: 'stripe',
      clientSecret: paymentIntent.client_secret!,
      checkoutUrl: null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as PaymentIntentResponse['status'],
      created: new Date(paymentIntent.created * 1000),
      providerTransactionId: paymentIntent.id,
      providerCheckoutSessionId: paymentIntent.id,
    };
  } catch (error) {
    logger.error('Failed to retrieve payment intent', {
      error: summarizeStripeError(error),
      paymentIntentId,
    });
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
      provider: 'stripe',
      clientSecret: paymentIntent.client_secret!,
      checkoutUrl: null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as PaymentIntentResponse['status'],
      created: new Date(paymentIntent.created * 1000),
      providerTransactionId: paymentIntent.id,
      providerCheckoutSessionId: paymentIntent.id,
    };
  } catch (error) {
    logger.error('Failed to cancel payment intent', {
      error: summarizeStripeError(error),
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Create a refund
 */
export async function createRefund(request: RefundRequest): Promise<RefundResponse> {
  const client = getStripeClient();

  try {
    const params: StripeCore.Stripe.RefundCreateParams = {
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
    logger.error('Failed to create refund', {
      error: summarizeStripeError(error),
      request: summarizeRefundRequest(request),
    });
    throw error;
  }
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
  const client = getStripeClient();

  try {
    const params: StripeCore.Stripe.CustomerCreateParams = {
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

    logger.info('Customer created', {
      customerId: customer.id,
      hasEmail: Boolean(customer.email),
      hasPhone: Boolean(customer.phone),
    });

    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      created: new Date(customer.created * 1000),
    };
  } catch (error) {
    logger.error('Failed to create customer', {
      error: summarizeStripeError(error),
      request: summarizeCustomerRequest(request),
    });
    throw error;
  }
}

/**
 * Create a Stripe price for a monthly donation amount.
 */
export async function createMonthlyPrice(
  request: CreateMonthlyPriceRequest
): Promise<StripePriceResponse> {
  const client = getStripeClient();

  try {
    const params: StripeCore.Stripe.PriceCreateParams = {
      unit_amount: request.amount,
      currency: request.currency.toLowerCase(),
      recurring: {
        interval: 'month',
      },
      metadata: request.metadata,
    };

    if (request.productId) {
      params.product = request.productId;
    } else {
      params.product_data = {
        name: request.productName,
      };
    }

    const price = await client.prices.create(params);

    return {
      id: price.id,
      productId: getStripeId(price.product as string | StripeCore.Stripe.Product | StripeCore.Stripe.DeletedProduct | null) || '',
      unitAmount: price.unit_amount || request.amount,
      currency: price.currency,
    };
  } catch (error) {
    logger.error('Failed to create monthly price', {
      error: summarizeStripeError(error),
      request: summarizeMonthlyPriceRequest(request),
    });
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
    logger.error('Failed to retrieve customer', {
      error: summarizeStripeError(error),
      customerId,
    });
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
    logger.error('Failed to list payment methods', {
      error: summarizeStripeError(error),
      customerId,
    });
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
    const params: StripeCore.Stripe.SubscriptionCreateParams = {
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

    return mapSubscription(subscription);
  } catch (error) {
    logger.error('Failed to create subscription', {
      error: summarizeStripeError(error),
      request: summarizeSubscriptionRequest(request),
    });
    throw error;
  }
}

/**
 * Create a Checkout Session for a recurring donation subscription.
 */
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  const client = getStripeClient();

  try {
    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      customer: request.customerId,
      line_items: [{ price: request.priceId, quantity: 1 }],
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      metadata: request.metadata,
      subscription_data: {
        metadata: request.metadata,
      },
      allow_promotion_codes: false,
    });

    return {
      id: session.id,
      provider: 'stripe',
      url: session.url || '',
      customerId: getStripeId(session.customer as string | StripeCore.Stripe.Customer | StripeCore.Stripe.DeletedCustomer | null),
      subscriptionId: getStripeId(session.subscription as string | StripeCore.Stripe.Subscription | null),
      status: session.status || 'open',
      providerTransactionId: getStripeId(session.subscription as string | StripeCore.Stripe.Subscription | null),
    };
  } catch (error) {
    logger.error('Failed to create checkout session', {
      error: summarizeStripeError(error),
      request: summarizeCheckoutSessionRequest(request),
    });
    throw error;
  }
}

/**
 * Retrieve a Checkout Session.
 */
export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionResponse> {
  const client = getStripeClient();

  try {
    const session = await client.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    return {
      id: session.id,
      provider: 'stripe',
      url: session.url || '',
      customerId: getStripeId(session.customer as string | StripeCore.Stripe.Customer | StripeCore.Stripe.DeletedCustomer | null),
      subscriptionId: getStripeId(session.subscription as string | StripeCore.Stripe.Subscription | null),
      status: session.status || 'open',
      providerTransactionId: getStripeId(session.subscription as string | StripeCore.Stripe.Subscription | null),
    };
  } catch (error) {
    logger.error('Failed to retrieve checkout session', {
      error: summarizeStripeError(error),
      sessionId,
    });
    throw error;
  }
}

/**
 * Retrieve a subscription.
 */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
  const client = getStripeClient();

  try {
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    return mapSubscription(subscription);
  } catch (error) {
    logger.error('Failed to retrieve subscription', {
      error: summarizeStripeError(error),
      subscriptionId,
    });
    throw error;
  }
}

/**
 * Update a subscription to a new monthly price without prorating the current cycle.
 */
export async function updateSubscriptionPrice(
  subscriptionId: string,
  priceId: string
): Promise<SubscriptionResponse> {
  const client = getStripeClient();

  try {
    const current = await client.subscriptions.retrieve(subscriptionId);
    const currentItemId = current.items.data[0]?.id;

    if (!currentItemId) {
      throw new Error('Subscription is missing an editable line item');
    }

    const updated = await client.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItemId,
          price: priceId,
        },
      ],
      proration_behavior: 'none',
    });

    return mapSubscription(updated);
  } catch (error) {
    logger.error('Failed to update subscription price', {
      error: summarizeStripeError(error),
      subscriptionId,
      priceId,
    });
    throw error;
  }
}

/**
 * Update end-of-period cancellation state for a subscription.
 */
export async function setSubscriptionCancelAtPeriodEnd(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean
): Promise<SubscriptionResponse> {
  const client = getStripeClient();

  try {
    const subscription = await client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    return mapSubscription(subscription);
  } catch (error) {
    logger.error('Failed to update subscription cancellation state', {
      error: summarizeStripeError(error),
      subscriptionId,
      cancelAtPeriodEnd,
    });
    throw error;
  }
}

/**
 * Create a Billing Portal session for donor self-service.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<BillingPortalSessionResponse> {
  const client = getStripeClient();

  try {
    const session = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  } catch (error) {
    logger.error('Failed to create billing portal session', {
      error: summarizeStripeError(error),
      customerId,
    });
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
    let subscription: StripeCore.Stripe.Subscription;

    if (cancelAtPeriodEnd) {
      subscription = await client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      subscription = await client.subscriptions.cancel(subscriptionId);
    }

    logger.info('Subscription canceled', {
      subscriptionId,
      cancelAtPeriodEnd,
    });

    return mapSubscription(subscription);
  } catch (error) {
    logger.error('Failed to cancel subscription', {
      error: summarizeStripeError(error),
      subscriptionId,
    });
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
      provider: 'stripe',
      type: event.type as WebhookEvent['type'],
      data: event.data as unknown as WebhookEvent['data'],
      created: new Date(event.created * 1000),
      livemode: event.livemode,
    };
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: summarizeStripeError(error),
    });
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
  createMonthlyPrice,
  getCustomer,
  listPaymentMethods,
  createSubscription,
  createCheckoutSession,
  getCheckoutSession,
  getSubscription,
  updateSubscriptionPrice,
  setSubscriptionCancelAtPeriodEnd,
  createBillingPortalSession,
  cancelSubscription,
  constructWebhookEvent,
};
