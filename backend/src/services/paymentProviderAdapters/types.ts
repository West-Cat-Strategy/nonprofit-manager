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
  PaymentProvider,
  PaymentProviderConfig,
  RefundRequest,
  RefundResponse,
  SubscriptionResponse,
  WebhookEvent,
} from '@app-types/payment';

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  getConfig(): PaymentProviderConfig;
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
  createRefund(request: RefundRequest): Promise<RefundResponse>;
  createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse>;
  getCustomer(customerId: string): Promise<CustomerResponse>;
  listPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]>;
  createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResponse>;
  setSubscriptionCancelAtPeriodEnd(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<SubscriptionResponse>;
  createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSessionResponse>;
  getCheckoutSession(sessionId: string): Promise<CheckoutSessionResponse>;
  createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResponse>;
  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent>;
}

export type PaymentProviderAdapters = Record<PaymentProvider, PaymentProviderAdapter>;
