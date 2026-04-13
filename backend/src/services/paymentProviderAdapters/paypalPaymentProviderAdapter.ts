import { logger } from '@config/logger';
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
  fetchJson,
  fetchWithTimeout,
  FRONTEND_URL,
  formatPaypalMoney,
  getEnv,
  parseDate,
  PAYPAL_API_BASE,
  providerStatusFromPayPal,
} from './shared';
import type { PaymentProviderAdapter } from './types';

const getPaypalConfig = (): PaymentProviderConfig => ({
  configured: Boolean(getEnv('PAYPAL_CLIENT_ID') && getEnv('PAYPAL_CLIENT_SECRET')),
  clientId: getEnv('PAYPAL_CLIENT_ID'),
  webhookConfigured: Boolean(getEnv('PAYPAL_WEBHOOK_ID')),
});

async function getPaypalAccessToken(): Promise<string> {
  const clientId = getEnv('PAYPAL_CLIENT_ID');
  const clientSecret = getEnv('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetchWithTimeout(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = (await response.json().catch(() => ({}))) as { access_token?: string };
  if (!response.ok) {
    throw new Error('Failed to obtain PayPal access token');
  }
  if (!data.access_token) {
    throw new Error('Failed to obtain PayPal access token: missing access token');
  }

  return data.access_token;
}

const getPaypalHeaders = async (): Promise<Record<string, string>> => ({
  Authorization: `Bearer ${await getPaypalAccessToken()}`,
  'Content-Type': 'application/json',
});

export const createPaypalPaymentProviderAdapter = (): PaymentProviderAdapter => {
  const adapter: PaymentProviderAdapter = {
    provider: 'paypal',
    getConfig: getPaypalConfig,
    async createPaymentIntent(request: CreatePaymentIntentRequest) {
      const headers = await getPaypalHeaders();
      const order = await fetchJson<{
        id: string;
        status?: string;
        links?: Array<{ rel: string; href: string }>;
      }>(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: formatPaypalMoney(request.amount, request.currency || 'usd'),
              description: request.description || 'Donation',
              custom_id: request.donationId || undefined,
            },
          ],
          application_context: {
            return_url: `${FRONTEND_URL}/donations/payment-result?provider=paypal`,
            cancel_url: `${FRONTEND_URL}/donations/payment-result?provider=paypal&status=cancelled`,
          },
        }),
      });

      return {
        id: order.id,
        provider: 'paypal',
        clientSecret: null,
        checkoutUrl: order.links?.find((link) => link.rel === 'approve')?.href || null,
        amount: request.amount,
        currency: (request.currency || 'usd').toLowerCase(),
        status: providerStatusFromPayPal(order.status),
        created: new Date(),
        providerTransactionId: order.id,
        providerCheckoutSessionId: order.id,
      };
    },
    async getPaymentIntent(paymentIntentId: string) {
      const headers = await getPaypalHeaders();
      const order = await fetchJson<{
        id: string;
        status?: string;
        links?: Array<{ rel: string; href: string }>;
      }>(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(paymentIntentId)}`, {
        headers,
      });

      if ((order.status || '').toUpperCase() === 'APPROVED') {
        try {
          const capture = await fetchJson<{
            id: string;
            status?: string;
          }>(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(paymentIntentId)}/capture`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });

          return {
            id: capture.id,
            provider: 'paypal',
            clientSecret: null,
            checkoutUrl: order.links?.find((link) => link.rel === 'approve')?.href || null,
            amount: 0,
            currency: 'usd',
            status: providerStatusFromPayPal(capture.status),
            created: new Date(),
            providerTransactionId: capture.id,
            providerCheckoutSessionId: paymentIntentId,
          };
        } catch (error) {
          logger.warn('PayPal capture attempt failed', { error, paymentIntentId });
        }
      }

      return {
        id: order.id,
        provider: 'paypal',
        clientSecret: null,
        checkoutUrl: order.links?.find((link) => link.rel === 'approve')?.href || null,
        amount: 0,
        currency: 'usd',
        status: providerStatusFromPayPal(order.status),
        created: new Date(),
        providerTransactionId: order.id,
        providerCheckoutSessionId: paymentIntentId,
      };
    },
    async cancelPaymentIntent(paymentIntentId: string) {
      return adapter.getPaymentIntent(paymentIntentId);
    },
    async createRefund(request: RefundRequest) {
      const headers = await getPaypalHeaders();
      const order = await fetchJson<{
        purchase_units?: Array<{
          payments?: { captures?: Array<{ id: string }> };
        }>;
      }>(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(request.paymentIntentId)}`, {
        headers,
      });
      const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      if (!captureId) {
        throw new Error('Unable to locate PayPal capture for refund');
      }

      const refund = await fetchJson<{
        id: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }>(`${PAYPAL_API_BASE}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          request.amount
            ? { amount: { value: (request.amount / 100).toFixed(2), currency_code: 'USD' } }
            : {}
        ),
      });

      return {
        id: refund.id,
        amount: request.amount || Math.round(Number.parseFloat(refund.amount?.value || '0') * 100),
        currency: (refund.amount?.currency_code || 'USD').toLowerCase(),
        status: (refund.status || 'succeeded').toLowerCase() as RefundResponse['status'],
        paymentIntentId: request.paymentIntentId,
        reason: request.reason,
        created: new Date(),
      };
    },
    async createCustomer(request: CreateCustomerRequest) {
      return {
        id: `paypal_${Buffer.from(request.email).toString('hex').slice(0, 24)}`,
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
      const headers = await getPaypalHeaders();
      const planId = getEnv('PAYPAL_PLAN_ID') || request.priceId;
      const subscription = await fetchJson<{
        id: string;
        status?: string;
        links?: Array<{ rel: string; href: string }>;
        start_time?: string;
        create_time?: string;
      }>(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan_id: planId,
          subscriber: {
            email_address: request.metadata?.email || undefined,
            name: request.metadata?.name
              ? {
                  given_name: request.metadata.name,
                }
              : undefined,
          },
          application_context: {
            return_url: `${FRONTEND_URL}/recurring-donations/checkout-result?provider=paypal`,
            cancel_url: `${FRONTEND_URL}/recurring-donations/checkout-result?provider=paypal&status=cancelled`,
          },
        }),
      });

      return {
        id: subscription.id,
        provider: 'paypal',
        customerId: request.customerId,
        status: providerStatusFromPayPal(subscription.status) as SubscriptionResponse['status'],
        currentPeriodStart: new Date(subscription.start_time || subscription.create_time || new Date()),
        currentPeriodEnd: new Date(subscription.start_time || subscription.create_time || new Date()),
        cancelAtPeriodEnd: false,
        created: new Date(subscription.create_time || new Date()),
        providerSubscriptionId: subscription.id,
        checkoutUrl: subscription.links?.find((link) => link.rel === 'approve')?.href || null,
      };
    },
    async getSubscription(subscriptionId: string) {
      const headers = await getPaypalHeaders();
      const subscription = await fetchJson<{
        id: string;
        status?: string;
        start_time?: string;
        create_time?: string;
      }>(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        headers,
      });

      return {
        id: subscription.id,
        provider: 'paypal',
        customerId: '',
        status: providerStatusFromPayPal(subscription.status) as SubscriptionResponse['status'],
        currentPeriodStart: new Date(subscription.start_time || subscription.create_time || new Date()),
        currentPeriodEnd: new Date(subscription.start_time || subscription.create_time || new Date()),
        cancelAtPeriodEnd: false,
        created: new Date(subscription.create_time || new Date()),
        providerSubscriptionId: subscription.id,
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
        provider: 'paypal',
        url:
          subscription.checkoutUrl ||
          `${FRONTEND_URL}/recurring-donations/checkout-result?provider=paypal&session_id=${encodeURIComponent(subscription.id)}`,
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
        provider: 'paypal',
        url:
          subscription.checkoutUrl ||
          `${FRONTEND_URL}/recurring-donations/checkout-result?provider=paypal&session_id=${encodeURIComponent(subscription.id)}`,
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
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const certUrl = headers['paypal-cert-url'];
      const authAlgo = headers['paypal-auth-algo'];
      const transmissionSig = headers['paypal-transmission-sig'];

      if (
        typeof transmissionId !== 'string' ||
        typeof transmissionTime !== 'string' ||
        typeof certUrl !== 'string' ||
        typeof authAlgo !== 'string' ||
        typeof transmissionSig !== 'string'
      ) {
        throw new Error('Missing PayPal webhook signature headers');
      }

      const webhookId = getEnv('PAYPAL_WEBHOOK_ID');
      if (!webhookId) {
        throw new Error('PAYPAL_WEBHOOK_ID is not configured');
      }

      const verification = await fetchJson<{ verification_status?: string }>(
        `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: await getPaypalHeaders(),
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: JSON.parse(rawBody.toString('utf-8')),
          }),
        }
      );

      if ((verification.verification_status || '').toUpperCase() !== 'SUCCESS') {
        throw new Error('PayPal webhook verification failed');
      }

      const payload = JSON.parse(rawBody.toString('utf-8')) as {
        id: string;
        event_type: string;
        create_time: string;
        resource: Record<string, unknown>;
      };

      return {
        provider: 'paypal',
        id: payload.id,
        type: payload.event_type as WebhookEvent['type'],
        created: parseDate(payload.create_time),
        livemode: !/sandbox/i.test(PAYPAL_API_BASE),
        data: { object: payload.resource || {} },
      };
    },
  };

  return adapter;
};
