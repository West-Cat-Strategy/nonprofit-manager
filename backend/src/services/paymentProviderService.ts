/**
 * Payment Provider Service
 * Registry and dispatcher for Stripe, PayPal, and Square adapters.
 */

import type {
  BillingPortalSessionResponse,
  CheckoutSessionResponse,
  CreateCheckoutSessionRequest,
  CreateCustomerRequest,
  CreatePaymentIntentRequest,
  CreateSubscriptionRequest,
  CustomerResponse,
  PaymentConfig,
  PaymentIntentResponse,
  PaymentMethodInfo,
  PaymentProvider,
  RefundRequest,
  RefundResponse,
  SubscriptionResponse,
  WebhookEvent,
} from '@app-types/payment';
import {
  createPaymentProviderAdapters,
  paymentProviderOrder,
  resolveSafePaymentProviderHostname,
} from './paymentProviderAdapters';
import type { PaymentProviderAdapters } from './paymentProviderAdapters';

export { resolveSafePaymentProviderHostname };

export class PaymentProviderService {
  constructor(private readonly adapters: PaymentProviderAdapters = createPaymentProviderAdapters()) {}

  private getAdapter(provider: PaymentProvider) {
    return this.adapters[provider];
  }

  private getDefaultProvider(): PaymentProvider {
    return this.getPaymentConfig().defaultProvider;
  }

  getPaymentConfig(): PaymentConfig {
    const providers = paymentProviderOrder.reduce(
      (accumulator, provider) => {
        accumulator[provider] = this.getAdapter(provider).getConfig();
        return accumulator;
      },
      {} as PaymentConfig['providers']
    );
    const enabledProviders = paymentProviderOrder.filter((provider) => providers[provider].configured);

    return {
      defaultProvider: enabledProviders[0] || 'stripe',
      enabledProviders,
      providers,
    };
  }

  isProviderConfigured(provider: PaymentProvider): boolean {
    return this.getAdapter(provider).getConfig().configured;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    const provider = request.provider || this.getDefaultProvider();
    return this.getAdapter(provider).createPaymentIntent(request);
  }

  async getPaymentIntent(
    paymentIntentId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<PaymentIntentResponse> {
    return this.getAdapter(provider).getPaymentIntent(paymentIntentId);
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<PaymentIntentResponse> {
    return this.getAdapter(provider).cancelPaymentIntent(paymentIntentId);
  }

  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    const provider = request.provider || 'stripe';
    return this.getAdapter(provider).createRefund(request);
  }

  async createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
    const provider = request.provider || 'stripe';
    return this.getAdapter(provider).createCustomer(request);
  }

  async getCustomer(customerId: string, provider: PaymentProvider = 'stripe'): Promise<CustomerResponse> {
    return this.getAdapter(provider).getCustomer(customerId);
  }

  async listPaymentMethods(
    customerId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<PaymentMethodInfo[]> {
    return this.getAdapter(provider).listPaymentMethods(customerId);
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    const provider = request.provider || 'stripe';
    return this.getAdapter(provider).createSubscription(request);
  }

  async getSubscription(
    subscriptionId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<SubscriptionResponse> {
    return this.getAdapter(provider).getSubscription(subscriptionId);
  }

  async setSubscriptionCancelAtPeriodEnd(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
    provider: PaymentProvider = 'stripe'
  ): Promise<SubscriptionResponse> {
    return this.getAdapter(provider).setSubscriptionCancelAtPeriodEnd(subscriptionId, cancelAtPeriodEnd);
  }

  async createCheckoutSession(
    request: CreateCheckoutSessionRequest
  ): Promise<CheckoutSessionResponse> {
    const provider = request.provider || 'stripe';
    return this.getAdapter(provider).createCheckoutSession(request);
  }

  async getCheckoutSession(
    sessionId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<CheckoutSessionResponse> {
    return this.getAdapter(provider).getCheckoutSession(sessionId);
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<BillingPortalSessionResponse> {
    return this.getAdapter(provider).createBillingPortalSession(customerId, returnUrl);
  }

  async verifyWebhook(
    provider: PaymentProvider,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent> {
    return this.getAdapter(provider).verifyWebhook(rawBody, headers);
  }

  async parseWebhookEvent(
    provider: PaymentProvider,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent> {
    return this.verifyWebhook(provider, rawBody, headers);
  }

  async constructWebhookEvent(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent> {
    if (typeof headers['stripe-signature'] === 'string') {
      return this.verifyWebhook('stripe', rawBody, headers);
    }
    if (typeof headers['paypal-transmission-id'] === 'string') {
      return this.verifyWebhook('paypal', rawBody, headers);
    }
    if (typeof headers['x-square-hmacsha256-signature'] === 'string') {
      return this.verifyWebhook('square', rawBody, headers);
    }

    throw new Error('Unable to determine payment provider from webhook headers');
  }
}

export const paymentProviderService = new PaymentProviderService();
export default paymentProviderService;
