/**
 * Payment Provider Service
 * Provider registry for Stripe, PayPal, and Square.
 */

import crypto from 'crypto';
import dns from 'dns';
import { Agent, interceptors } from 'undici';
import net from 'net';
import { logger } from '@config/logger';
import stripeService from '@services/stripeService';
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
  PaymentProviderConfig,
  RefundRequest,
  RefundResponse,
  SubscriptionResponse,
  WebhookEvent,
} from '@app-types/payment';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE_URL ||
  (process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com');
const SQUARE_API_BASE =
  process.env.SQUARE_API_BASE_URL ||
  (process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com');

const PAYMENT_PROVIDERS: PaymentProvider[] = ['stripe', 'paypal', 'square'];
const PAYMENT_PROVIDER_REQUEST_TIMEOUT_MS = 30_000;

const getEnv = (key: string): string | null => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
};

const buildPaymentProviderConfig = (): Record<PaymentProvider, PaymentProviderConfig> => ({
  stripe: {
    configured: Boolean(getEnv('STRIPE_SECRET_KEY') && getEnv('STRIPE_PUBLISHABLE_KEY')),
    publicKey: getEnv('STRIPE_PUBLISHABLE_KEY'),
    webhookConfigured: Boolean(getEnv('STRIPE_WEBHOOK_SECRET')),
  },
  paypal: {
    configured: Boolean(getEnv('PAYPAL_CLIENT_ID') && getEnv('PAYPAL_CLIENT_SECRET')),
    clientId: getEnv('PAYPAL_CLIENT_ID'),
    webhookConfigured: Boolean(getEnv('PAYPAL_WEBHOOK_ID')),
  },
  square: {
    configured: Boolean(getEnv('SQUARE_ACCESS_TOKEN') && getEnv('SQUARE_LOCATION_ID')),
    applicationId: getEnv('SQUARE_APPLICATION_ID'),
    locationId: getEnv('SQUARE_LOCATION_ID'),
    webhookConfigured: Boolean(getEnv('SQUARE_WEBHOOK_SIGNATURE_KEY')),
  },
});

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const paymentProviderDispatcher = new Agent({
  interceptors: {
    Agent: [
      interceptors.dns({
        maxTTL: 0,
        lookup: (origin, _options, callback) => {
          void (async () => {
            try {
              const resolved = await resolveSafePaymentProviderHostname(origin.hostname);
              if (!resolved.ok) {
                callback(new Error(resolved.reason || 'Hostname is not allowed'), []);
                return;
              }

              callback(
                null,
                resolved.addresses.map((address) => ({
                  address,
                  family: address.includes(':') ? 6 : 4,
                  ttl: 0,
                }))
              );
            } catch (error) {
              callback(error as NodeJS.ErrnoException, []);
            }
          })();
        },
      }),
    ],
    Client: [
      interceptors.dns({
        maxTTL: 0,
        lookup: (origin, _options, callback) => {
          void (async () => {
            try {
              const resolved = await resolveSafePaymentProviderHostname(origin.hostname);
              if (!resolved.ok) {
                callback(new Error(resolved.reason || 'Hostname is not allowed'), []);
                return;
              }

              callback(
                null,
                resolved.addresses.map((address) => ({
                  address,
                  family: address.includes(':') ? 6 : 4,
                  ttl: 0,
                }))
              );
            } catch (error) {
              callback(error as NodeJS.ErrnoException, []);
            }
          })();
        },
      }),
    ],
  },
});

const formatProviderErrorBody = (text: string, contentType: string | null): string => {
  if (!text) {
    return 'Empty response body';
  }

  const trimmed = text.trim();
  const looksJson = (contentType || '').includes('json') || /^[\[{]/.test(trimmed);
  if (!looksJson) {
    return trimmed;
  }

  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
};

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
};

const isPrivateIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('2001:db8') ||
    (normalized.startsWith('::ffff:') && isPrivateIpv4(normalized.replace('::ffff:', '')))
  );
};

const isPrivateIp = (ip: string): boolean => {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
};

const createAbortController = (
  signal?: AbortSignal | null
): { controller: AbortController; cleanup: () => void; timeoutElapsed: () => boolean } => {
  const controller = new AbortController();
  let timeoutElapsed = false;
  const timeoutId = setTimeout(() => {
    timeoutElapsed = true;
    controller.abort();
  }, PAYMENT_PROVIDER_REQUEST_TIMEOUT_MS);

  const abortListener = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', abortListener, { once: true });
    }
  }

  return {
    controller,
    timeoutElapsed: () => timeoutElapsed,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', abortListener);
      }
    },
  };
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  const { controller, cleanup, timeoutElapsed } = createAbortController(init.signal ?? undefined);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...jsonHeaders,
        ...(init.headers || {}),
      },
      dispatcher: paymentProviderDispatcher,
    } as RequestInit & { dispatcher: Agent });
  } catch (error) {
    if (timeoutElapsed() || (error instanceof Error && error.name === 'AbortError')) {
      throw new Error(`Payment provider request timed out after ${PAYMENT_PROVIDER_REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    cleanup();
  }
}

async function readJsonResponse<T>(response: Response, context: string): Promise<T> {
  const text = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(
      `${context} (${response.status}): ${formatProviderErrorBody(text, response.headers.get('content-type'))}`
    );
  }

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON: ${text.slice(0, 1000)}`);
  }
}

export async function resolveSafePaymentProviderHostname(
  hostname: string
): Promise<{ ok: boolean; reason?: string; addresses: string[] }> {
  if (!hostname) {
    return { ok: false, reason: 'URL must include a hostname', addresses: [] };
  }

  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    return { ok: false, reason: 'Host is not allowed', addresses: [] };
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { ok: false, reason: 'IP address is not allowed', addresses: [] };
    }
    return { ok: true, addresses: [hostname] };
  }

  const results = (await (dns as any).lookup(hostname, { all: true, verbatim: true })) as Array<{
    address: string;
  }>;
  const addresses = results.map((entry) => entry.address);

  if (addresses.length === 0) {
    return { ok: false, reason: 'Hostname did not resolve', addresses: [] };
  }

  if (addresses.some((address) => isPrivateIp(address))) {
    return { ok: false, reason: 'Hostname resolves to a private IP', addresses: [] };
  }

  return { ok: true, addresses };
}

async function fetchJson<T>(
  url: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, init);
  return readJsonResponse<T>(response, 'Payment provider request failed');
}

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

  const data = await readJsonResponse<{ access_token?: string }>(response, 'Failed to obtain PayPal access token');

  if (!data.access_token) {
    throw new Error('Failed to obtain PayPal access token: missing access token');
  }

  return data.access_token;
}

const getPaypalHeaders = async (): Promise<Record<string, string>> => ({
  Authorization: `Bearer ${await getPaypalAccessToken()}`,
  'Content-Type': 'application/json',
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

const formatMoney = (amount: number, currency: string): { amount: number; currency: string } => ({
  amount,
  currency: currency.toUpperCase(),
});

const formatPaypalMoney = (amount: number, currency: string): { value: string; currency_code: string } => ({
  value: (amount / 100).toFixed(2),
  currency_code: currency.toUpperCase(),
});

const providerStatusFromPayPal = (status: string | undefined): PaymentIntentResponse['status'] => {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
      return 'succeeded';
    case 'APPROVED':
    case 'CREATED':
      return 'processing';
    case 'PAYER_ACTION_REQUIRED':
      return 'requires_action';
    case 'VOIDED':
    case 'CANCELLED':
      return 'canceled';
    default:
      return 'processing';
  }
};

const providerStatusFromSquare = (status: string | undefined): PaymentIntentResponse['status'] => {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
    case 'ACTIVE':
      return 'succeeded';
    case 'CANCELED':
    case 'CANCELLED':
      return 'canceled';
    case 'APPROVED':
    case 'OPEN':
    default:
      return 'processing';
  }
};

const hashValue = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const createSyntheticCustomerId = (provider: Exclude<PaymentProvider, 'stripe'>, email: string): string =>
  `${provider}_${hashValue(email).slice(0, 24)}`;

const parseDate = (value?: string | number | Date | null): Date => {
  if (!value) {
    return new Date();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

class PaymentProviderService {
  getPaymentConfig(): PaymentConfig {
    const providers = buildPaymentProviderConfig();
    const enabledProviders = PAYMENT_PROVIDERS.filter((provider) => providers[provider].configured);

    return {
      defaultProvider: enabledProviders[0] || 'stripe',
      enabledProviders,
      providers,
    };
  }

  isProviderConfigured(provider: PaymentProvider): boolean {
    return this.getPaymentConfig().providers[provider].configured;
  }

  async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<PaymentIntentResponse> {
    const provider = request.provider || this.getPaymentConfig().defaultProvider;

    if (provider === 'stripe') {
      const response = await stripeService.createPaymentIntent(request);
      return {
        ...response,
        provider: 'stripe',
        checkoutUrl: null,
        providerTransactionId: response.id,
        providerCheckoutSessionId: response.id,
      };
    }

    if (provider === 'paypal') {
      const headers = await getPaypalHeaders();
      const body = {
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
      };
      const order = await fetchJson<{
        id: string;
        status?: string;
        links?: Array<{ rel: string; href: string }>;
      }>(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const checkoutUrl = order.links?.find((link) => link.rel === 'approve')?.href || null;
      return {
        id: order.id,
        provider: 'paypal',
        clientSecret: null,
        checkoutUrl,
        amount: request.amount,
        currency: (request.currency || 'usd').toLowerCase(),
        status: providerStatusFromPayPal(order.status),
        created: new Date(),
        providerTransactionId: order.id,
        providerCheckoutSessionId: order.id,
      };
    }

    const headers = getSquareHeaders();
    const payload = {
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
    };

    const paymentLink = await fetchJson<{
      payment_link?: {
        id: string;
        url: string;
        order_id?: string | null;
      };
    }>(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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
  }

  async getPaymentIntent(
    paymentIntentId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<PaymentIntentResponse> {
    if (provider === 'stripe') {
      const response = await stripeService.getPaymentIntent(paymentIntentId);
      return {
        ...response,
        provider: 'stripe',
        checkoutUrl: null,
        providerTransactionId: response.id,
        providerCheckoutSessionId: response.id,
      };
    }

    if (provider === 'paypal') {
      const headers = await getPaypalHeaders();
      const order = await fetchJson<{
        id: string;
        status?: string;
        links?: Array<{ rel: string; href: string }>;
        purchase_units?: Array<{
          payments?: { captures?: Array<{ id: string; status?: string }> };
        }>;
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
    }

    const headers = getSquareHeaders();
    const order = await fetchJson<{
      order?: {
        id: string;
        state?: string;
        payment_ids?: string[];
      };
    }>(`${SQUARE_API_BASE}/v2/orders/${encodeURIComponent(paymentIntentId)}`, {
      headers,
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
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<PaymentIntentResponse> {
    if (provider === 'stripe') {
      const response = await stripeService.cancelPaymentIntent(paymentIntentId);
      return {
        ...response,
        provider: 'stripe',
        checkoutUrl: null,
        providerTransactionId: response.id,
        providerCheckoutSessionId: response.id,
      };
    }

    return this.getPaymentIntent(paymentIntentId, provider);
  }

  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    const provider = request.provider || 'stripe';
    if (provider === 'stripe') {
      return stripeService.createRefund(request);
    }

    if (provider === 'paypal') {
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
        amount:
          request.amount ||
          Math.round(Number.parseFloat(refund.amount?.value || '0') * 100),
        currency: (refund.amount?.currency_code || 'USD').toLowerCase(),
        status: (refund.status || 'succeeded').toLowerCase() as RefundResponse['status'],
        paymentIntentId: request.paymentIntentId,
        reason: request.reason,
        created: new Date(),
      };
    }

    const headers = getSquareHeaders();
    const payment = await fetchJson<{
      payment?: {
        id: string;
        amount_money?: { amount?: number; currency?: string };
      };
    }>(`${SQUARE_API_BASE}/v2/payments/${encodeURIComponent(request.paymentIntentId)}`, {
      headers,
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
      headers,
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
      currency: (refund.refund?.amount_money?.currency || payment.payment?.amount_money?.currency || 'USD').toLowerCase(),
      status: (refund.refund?.status || 'succeeded').toLowerCase() as RefundResponse['status'],
      paymentIntentId: request.paymentIntentId,
      reason: request.reason,
      created: new Date(),
    };
  }

  async createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
    const provider = request.provider || 'stripe';
    if (provider === 'stripe') {
      return stripeService.createCustomer(request);
    }

    if (provider === 'paypal') {
      return {
        id: createSyntheticCustomerId('paypal', request.email),
        email: request.email,
        name: request.name,
        phone: request.phone,
        created: new Date(),
      };
    }

    const headers = getSquareHeaders();
    const customer = await fetchJson<{
      customer?: { id: string; email_address?: string; given_name?: string; family_name?: string };
    }>(`${SQUARE_API_BASE}/v2/customers`, {
      method: 'POST',
      headers,
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
  }

  async getCustomer(customerId: string, provider: PaymentProvider = 'stripe'): Promise<CustomerResponse> {
    if (provider === 'stripe') {
      return stripeService.getCustomer(customerId);
    }

    return {
      id: customerId,
      email: '',
      created: new Date(),
    };
  }

  async listPaymentMethods(
    customerId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<PaymentMethodInfo[]> {
    if (provider === 'stripe') {
      return stripeService.listPaymentMethods(customerId);
    }

    return [];
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    const provider = request.provider || 'stripe';
    if (provider === 'stripe') {
      return stripeService.createSubscription(request);
    }

    if (provider === 'paypal') {
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
    }

    const headers = getSquareHeaders();
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
      headers,
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
  }

  async getSubscription(
    subscriptionId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<SubscriptionResponse> {
    if (provider === 'stripe') {
      return stripeService.getSubscription(subscriptionId);
    }

    if (provider === 'paypal') {
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
    }

    const headers = getSquareHeaders();
    const subscription = await fetchJson<{
      subscription?: {
        id: string;
        status?: string;
        start_date?: string;
        charged_through_date?: string;
        customer_id?: string;
      };
    }>(`${SQUARE_API_BASE}/v2/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers,
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
  }

  async setSubscriptionCancelAtPeriodEnd(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
    provider: PaymentProvider = 'stripe'
  ): Promise<SubscriptionResponse> {
    if (provider === 'stripe') {
      return stripeService.setSubscriptionCancelAtPeriodEnd(subscriptionId, cancelAtPeriodEnd);
    }

    return this.getSubscription(subscriptionId, provider);
  }

  async createCheckoutSession(
    request: CreateCheckoutSessionRequest
  ): Promise<CheckoutSessionResponse> {
    const provider = request.provider || 'stripe';
    if (provider === 'stripe') {
      return stripeService.createCheckoutSession(request);
    }

    const subscription = await this.createSubscription({
      provider,
      customerId: request.customerId,
      priceId: request.priceId,
      paymentMethodId: undefined,
      metadata: request.metadata,
    });

    return {
      id: subscription.id,
      provider,
      url:
        subscription.checkoutUrl ||
        `${FRONTEND_URL}/recurring-donations/checkout-result?provider=${provider}&session_id=${encodeURIComponent(subscription.id)}`,
      customerId: request.customerId,
      subscriptionId: subscription.id,
      status: subscription.status,
      providerTransactionId: subscription.providerSubscriptionId || subscription.id,
    };
  }

  async getCheckoutSession(
    sessionId: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<CheckoutSessionResponse> {
    if (provider === 'stripe') {
      return stripeService.getCheckoutSession(sessionId);
    }

    const subscription = await this.getSubscription(sessionId, provider);
    return {
      id: subscription.id,
      provider,
      url:
        subscription.checkoutUrl ||
        `${FRONTEND_URL}/recurring-donations/checkout-result?provider=${provider}&session_id=${encodeURIComponent(subscription.id)}`,
      customerId: subscription.customerId || null,
      subscriptionId: subscription.id,
      status: subscription.status,
      providerTransactionId: subscription.providerSubscriptionId || subscription.id,
    };
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
    provider: PaymentProvider = 'stripe'
  ): Promise<BillingPortalSessionResponse> {
    if (provider === 'stripe') {
      return stripeService.createBillingPortalSession(customerId, returnUrl);
    }

    return { url: returnUrl };
  }

  async verifyWebhook(
    provider: PaymentProvider,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent> {
    if (provider === 'stripe') {
      const signature = headers['stripe-signature'];
      if (typeof signature !== 'string') {
        throw new Error('Missing Stripe signature');
      }
      return stripeService.constructWebhookEvent(rawBody, signature);
    }

    if (provider === 'paypal') {
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
        summary?: string;
      };

    return {
      provider,
      id: payload.id,
      type: payload.event_type as WebhookEvent['type'],
      created: parseDate(payload.create_time),
      livemode: !/sandbox/i.test(PAYPAL_API_BASE),
      data: { object: payload.resource || {} },
    };
    }

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
      provider,
      id: payload.event_id,
      type: payload.type as WebhookEvent['type'],
      created: parseDate(payload.created_at),
      livemode: !/sandbox/i.test(SQUARE_API_BASE),
      data: { object: payload.data?.object || {} },
    };
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
