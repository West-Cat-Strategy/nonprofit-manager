import crypto from 'crypto';
import type {
  BillingPortalSessionResponse,
  CreateCheckoutSessionRequest,
  CreateCustomerRequest,
  CreatePaymentIntentRequest,
  CreateSubscriptionRequest,
  PaymentMethodInfo,
  PaymentProviderConfig,
  RefundRequest,
  RefundResponse,
  SubscriptionResponse,
  WebhookEvent,
} from '@app-types/payment';
import {
  createSyntheticCustomerId,
  fetchJson,
  formatMoney,
  FRONTEND_URL,
  getEnv,
  parseDate,
  providerStatusFromSquare,
  SQUARE_API_BASE,
} from './shared';
import type { PaymentProviderAdapter } from './types';

const getSquareConfig = (): PaymentProviderConfig => ({
  configured: Boolean(getEnv('SQUARE_ACCESS_TOKEN') && getEnv('SQUARE_LOCATION_ID')),
  applicationId: getEnv('SQUARE_APPLICATION_ID'),
  locationId: getEnv('SQUARE_LOCATION_ID'),
  webhookConfigured: Boolean(getEnv('SQUARE_WEBHOOK_SIGNATURE_KEY')),
});

const getSquareHeaders = (): Record<string, string> => {
  const token = getEnv('SQUARE_ACCESS_TOKEN');
  if (!token) {
    throw new Error('Square credentials are not configured');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Square-Version': '2025-03-19',
  };
};

export const createSquarePaymentProviderAdapter = (): PaymentProviderAdapter => {
  const adapter: PaymentProviderAdapter = {
    provider: 'square',
    getConfig: getSquareConfig,
    async createPaymentIntent(request: CreatePaymentIntentRequest) {
      const paymentLink = await fetchJson<{
        payment_link?: {
          id: string;
          url: string;
          order_id?: string | null;
        };
      }>(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
        method: 'POST',
        headers: getSquareHeaders(),
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          quick_pay: {
            name: request.description || 'Donation',
            price_money: formatMoney(request.amount, request.currency || 'usd'),
            location_id: getEnv('SQUARE_LOCATION_ID'),
          },
          checkout_options: {
            redirect_url: `${FRONTEND_URL}/donations/payment-result?provider=square`,
            ask_for_shipping_address: false,
          },
          pre_populated_data: {
            buyer_email_address: request.receiptEmail || undefined,
          },
        }),
      });

      const link = paymentLink.payment_link;
      if (!link) {
        throw new Error('Square payment link response missing payment_link payload');
      }

      return {
        id: link.order_id || link.id,
        provider: 'square',
        clientSecret: null,
        checkoutUrl: link.url,
        amount: request.amount,
        currency: (request.currency || 'usd').toLowerCase(),
        status: 'requires_action',
        created: new Date(),
        providerTransactionId: link.order_id || link.id,
        providerCheckoutSessionId: link.id,
      };
    },
    async getPaymentIntent(paymentIntentId: string) {
      const order = await fetchJson<{
        order?: {
          id: string;
          state?: string;
          payment_ids?: string[];
        };
      }>(`${SQUARE_API_BASE}/v2/orders/${encodeURIComponent(paymentIntentId)}`, {
        headers: getSquareHeaders(),
      });

      const squareOrder = order.order;
      if (!squareOrder) {
        throw new Error('Square order not found');
      }

      return {
        id: squareOrder.id,
        provider: 'square',
        clientSecret: null,
        checkoutUrl: null,
        amount: 0,
        currency: 'usd',
        status: providerStatusFromSquare(squareOrder.state),
        created: new Date(),
        providerTransactionId: squareOrder.payment_ids?.[0] || squareOrder.id,
        providerCheckoutSessionId: squareOrder.id,
      };
    },
    async cancelPaymentIntent(paymentIntentId: string) {
      return adapter.getPaymentIntent(paymentIntentId);
    },
    async createRefund(request: RefundRequest) {
      const payment = await fetchJson<{
        payment?: {
          id: string;
          amount_money?: { amount?: number; currency?: string };
        };
      }>(`${SQUARE_API_BASE}/v2/payments/${encodeURIComponent(request.paymentIntentId)}`, {
        headers: getSquareHeaders(),
      });
      const paymentId = payment.payment?.id || request.paymentIntentId;

      const refund = await fetchJson<{
        refund?: {
          id: string;
          status?: string;
          amount_money?: { amount?: number; currency?: string };
        };
      }>(`${SQUARE_API_BASE}/v2/refunds`, {
        method: 'POST',
        headers: getSquareHeaders(),
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          payment_id: paymentId,
          amount_money: request.amount
            ? { amount: request.amount, currency: payment.payment?.amount_money?.currency || 'USD' }
            : undefined,
        }),
      });

      return {
        id: refund.refund?.id || crypto.randomUUID(),
        amount:
          refund.refund?.amount_money?.amount !== undefined
            ? refund.refund.amount_money.amount
            : request.amount || 0,
        currency: (
          refund.refund?.amount_money?.currency ||
          payment.payment?.amount_money?.currency ||
          'USD'
        ).toLowerCase(),
        status: (refund.refund?.status || 'succeeded').toLowerCase() as RefundResponse['status'],
        paymentIntentId: request.paymentIntentId,
        reason: request.reason,
        created: new Date(),
      };
    },
    async createCustomer(request: CreateCustomerRequest) {
      const customer = await fetchJson<{
        customer?: { id: string };
      }>(`${SQUARE_API_BASE}/v2/customers`, {
        method: 'POST',
        headers: getSquareHeaders(),
        body: JSON.stringify({
          email_address: request.email,
          given_name: request.name,
          phone_number: request.phone,
        }),
      });

      return {
        id: customer.customer?.id || createSyntheticCustomerId('square', request.email),
        email: request.email,
        name: request.name,
        phone: request.phone,
        created: new Date(),
      };
    },
    async getCustomer(customerId: string) {
      return {
        id: customerId,
        email: '',
        created: new Date(),
      };
    },
    async listPaymentMethods(_customerId: string): Promise<PaymentMethodInfo[]> {
      return [];
    },
    async createSubscription(request: CreateSubscriptionRequest) {
      const subscription = await fetchJson<{
        subscription?: {
          id: string;
          status?: string;
          start_date?: string;
          charged_through_date?: string;
          customer_id?: string;
        };
      }>(`${SQUARE_API_BASE}/v2/subscriptions`, {
        method: 'POST',
        headers: getSquareHeaders(),
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          location_id: getEnv('SQUARE_LOCATION_ID'),
          customer_id: request.customerId,
          plan_variation_id: request.priceId || getEnv('SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID'),
        }),
      });

      const sub = subscription.subscription;
      if (!sub) {
        throw new Error('Square subscription response missing subscription payload');
      }

      return {
        id: sub.id,
        provider: 'square',
        customerId: request.customerId,
        status: providerStatusFromSquare(sub.status) as SubscriptionResponse['status'],
        currentPeriodStart: new Date(sub.start_date || new Date()),
        currentPeriodEnd: new Date(sub.charged_through_date || sub.start_date || new Date()),
        cancelAtPeriodEnd: false,
        created: new Date(sub.start_date || new Date()),
        providerSubscriptionId: sub.id,
        checkoutUrl: null,
      };
    },
    async getSubscription(subscriptionId: string) {
      const subscription = await fetchJson<{
        subscription?: {
          id: string;
          status?: string;
          start_date?: string;
          charged_through_date?: string;
          customer_id?: string;
        };
      }>(`${SQUARE_API_BASE}/v2/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        headers: getSquareHeaders(),
      });
      const sub = subscription.subscription;
      if (!sub) {
        throw new Error('Square subscription not found');
      }

      return {
        id: sub.id,
        provider: 'square',
        customerId: sub.customer_id || '',
        status: providerStatusFromSquare(sub.status) as SubscriptionResponse['status'],
        currentPeriodStart: new Date(sub.start_date || new Date()),
        currentPeriodEnd: new Date(sub.charged_through_date || sub.start_date || new Date()),
        cancelAtPeriodEnd: false,
        created: new Date(sub.start_date || new Date()),
        providerSubscriptionId: sub.id,
        checkoutUrl: null,
      };
    },
    async setSubscriptionCancelAtPeriodEnd(subscriptionId: string) {
      return adapter.getSubscription(subscriptionId);
    },
    async createCheckoutSession(request: CreateCheckoutSessionRequest) {
      const subscription = await adapter.createSubscription({
        customerId: request.customerId,
        priceId: request.priceId,
        paymentMethodId: undefined,
        metadata: request.metadata,
      });

      return {
        id: subscription.id,
        provider: 'square',
        url:
          subscription.checkoutUrl ||
          `${FRONTEND_URL}/recurring-donations/checkout-result?provider=square&session_id=${encodeURIComponent(subscription.id)}`,
        customerId: request.customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        providerTransactionId: subscription.providerSubscriptionId || subscription.id,
      };
    },
    async getCheckoutSession(sessionId: string) {
      const subscription = await adapter.getSubscription(sessionId);
      return {
        id: subscription.id,
        provider: 'square',
        url:
          subscription.checkoutUrl ||
          `${FRONTEND_URL}/recurring-donations/checkout-result?provider=square&session_id=${encodeURIComponent(subscription.id)}`,
        customerId: subscription.customerId || null,
        subscriptionId: subscription.id,
        status: subscription.status,
        providerTransactionId: subscription.providerSubscriptionId || subscription.id,
      };
    },
    async createBillingPortalSession(
      _customerId: string,
      returnUrl: string
    ): Promise<BillingPortalSessionResponse> {
      return { url: returnUrl };
    },
    async verifyWebhook(
      rawBody: Buffer,
      headers: Record<string, string | string[] | undefined>
    ): Promise<WebhookEvent> {
      const signature = headers['x-square-hmacsha256-signature'];
      if (typeof signature !== 'string') {
        throw new Error('Missing Square signature');
      }

      const secret = getEnv('SQUARE_WEBHOOK_SIGNATURE_KEY');
      if (!secret) {
        throw new Error('Square webhook signature key is not configured');
      }

      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      if (expected !== signature) {
        throw new Error('Square webhook signature verification failed');
      }

      const payload = JSON.parse(rawBody.toString('utf-8')) as {
        event_id: string;
        type: string;
        created_at?: string;
        data?: { object?: Record<string, unknown> };
      };

      return {
        provider: 'square',
        id: payload.event_id,
        type: payload.type as WebhookEvent['type'],
        created: parseDate(payload.created_at),
        livemode: !/sandbox/i.test(SQUARE_API_BASE),
        data: { object: payload.data?.object || {} },
      };
    },
  };

  return adapter;
};
