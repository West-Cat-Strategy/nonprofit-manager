import crypto from 'crypto';
import dns from 'dns';
import net from 'net';
import { Agent, interceptors } from 'undici';
import type { Dispatcher } from 'undici';
import type { PaymentIntentResponse } from '@app-types/payment';

export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
export const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE_URL ||
  (process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com');
export const SQUARE_API_BASE =
  process.env.SQUARE_API_BASE_URL ||
  (process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com');
const PAYMENT_PROVIDER_REQUEST_TIMEOUT_MS = 30_000;

const jsonHeaders = {
  'Content-Type': 'application/json',
};

export const getEnv = (key: string): string | null => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
};

const formatProviderErrorBody = (text: string, contentType: string | null): string => {
  if (!text) {
    return 'Empty response body';
  }

  const trimmed = text.trim();
  const looksJson = (contentType || '').includes('json') || /^[[{]/.test(trimmed);
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
  if (version === 4) {
    return isPrivateIpv4(ip);
  }
  if (version === 6) {
    return isPrivateIpv6(ip);
  }
  return false;
};

const paymentProviderDispatcher: Dispatcher = new Agent().compose(
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
  })
);

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

export async function fetchWithTimeout(
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
    } as RequestInit & { dispatcher: Dispatcher });
  } catch (error) {
    if (timeoutElapsed() || (error instanceof Error && error.name === 'AbortError')) {
      throw Object.assign(new Error(`Payment provider request timed out after ${PAYMENT_PROVIDER_REQUEST_TIMEOUT_MS}ms`), {
        cause: error,
      });
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
  } catch (error) {
    throw Object.assign(new Error(`${context} returned invalid JSON: ${text.slice(0, 1000)}`), {
      cause: error,
    });
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, init);
  return readJsonResponse<T>(response, 'Payment provider request failed');
}

export const formatMoney = (amount: number, currency: string): { amount: number; currency: string } => ({
  amount,
  currency: currency.toUpperCase(),
});

export const formatPaypalMoney = (amount: number, currency: string): { value: string; currency_code: string } => ({
  value: (amount / 100).toFixed(2),
  currency_code: currency.toUpperCase(),
});

export const providerStatusFromPayPal = (
  status: string | undefined
): PaymentIntentResponse['status'] => {
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

export const providerStatusFromSquare = (
  status: string | undefined
): PaymentIntentResponse['status'] => {
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

export const createSyntheticCustomerId = (
  provider: 'paypal' | 'square',
  email: string
): string => `${provider}_${hashValue(email).slice(0, 24)}`;

export const parseDate = (value?: string | number | Date | null): Date => {
  if (!value) {
    return new Date();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};
