import stripeService from '@services/stripeService';
import type {
  BillingPortalSessionResponse,
  CheckoutSessionResponse,
  CreateCheckoutSessionRequest,
  CreateCustomerRequest,
  CreatePaymentIntentRequest,
  CreateSubscriptionRequest,
  CustomerResponse,
  PaymentIntentResponse,
  PaymentMethodInfo,
  PaymentProviderConfig,
  RefundRequest,
  RefundResponse,
  SubscriptionResponse,
  WebhookEvent,
} from '@app-types/payment';
import { getEnv } from './shared';
import type { PaymentProviderAdapter } from './types';

const getStripeConfig = (): PaymentProviderConfig => ({
  configured: Boolean(getEnv('STRIPE_SECRET_KEY') && getEnv('STRIPE_PUBLISHABLE_KEY')),
  publicKey: getEnv('STRIPE_PUBLISHABLE_KEY'),
  webhookConfigured: Boolean(getEnv('STRIPE_WEBHOOK_SECRET')),
});

export const createStripePaymentProviderAdapter = (): PaymentProviderAdapter => ({
  provider: 'stripe',
  getConfig: getStripeConfig,
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    return stripeService.createPaymentIntent(request);
  },
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    return stripeService.getPaymentIntent(paymentIntentId);
  },
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    return stripeService.cancelPaymentIntent(paymentIntentId);
  },
  createRefund(request: RefundRequest): Promise<RefundResponse> {
    return stripeService.createRefund(request);
  },
  createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
    return stripeService.createCustomer(request);
  },
  getCustomer(customerId: string): Promise<CustomerResponse> {
    return stripeService.getCustomer(customerId);
  },
  listPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
    return stripeService.listPaymentMethods(customerId);
  },
  createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    return stripeService.createSubscription(request);
  },
  getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    return stripeService.getSubscription(subscriptionId);
  },
  setSubscriptionCancelAtPeriodEnd(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<SubscriptionResponse> {
    return stripeService.setSubscriptionCancelAtPeriodEnd(subscriptionId, cancelAtPeriodEnd);
  },
  createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    return stripeService.createCheckoutSession(request);
  },
  getCheckoutSession(sessionId: string): Promise<CheckoutSessionResponse> {
    return stripeService.getCheckoutSession(sessionId);
  },
  createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResponse> {
    return stripeService.createBillingPortalSession(customerId, returnUrl);
  },
  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent> {
    const signature = headers['stripe-signature'];
    if (typeof signature !== 'string') {
      throw new Error('Missing Stripe signature');
    }

    return stripeService.constructWebhookEvent(rawBody, signature);
  },
});
