import dns from 'dns/promises';
import net from 'net';

const WEBHOOK_TIMEOUT = 30000;
const WEBHOOK_FETCH_OPTIONS = { redirect: 'manual' as const };
const PRIVATE_HOSTNAME_SUFFIXES = ['.localhost', '.local'];
const BLOCKED_HOSTNAMES = new Set(['localhost']);

export const truncateWebhookResponseBody = (value?: string): string | undefined =>
  value ? value.substring(0, 1000) : undefined;

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
};

const isPrivateIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();

  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  if (normalized.startsWith('2001:db8')) return true;

  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.replace('::ffff:', '');
    return isPrivateIpv4(ipv4);
  }

  return false;
};

const isPrivateHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (PRIVATE_HOSTNAME_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return true;
  return false;
};

const isPrivateIp = (ip: string): boolean => {
  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) return isPrivateIpv4(ip);
  if (ipVersion === 6) return isPrivateIpv6(ip);
  return false;
};

async function resolveSafeWebhookHostname(
  hostname: string
): Promise<{ ok: boolean; reason?: string; addresses: string[] }> {
  if (!hostname) {
    return { ok: false, reason: 'URL must include a hostname', addresses: [] };
  }

  if (isPrivateHost(hostname)) {
    return { ok: false, reason: 'Host is not allowed', addresses: [] };
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { ok: false, reason: 'IP address is not allowed', addresses: [] };
    }
    return { ok: true, addresses: [hostname] };
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
      return { ok: false, reason: 'Hostname did not resolve', addresses: [] };
    }

    if (addresses.some((addr) => isPrivateIp(addr.address))) {
      return { ok: false, reason: 'Hostname resolves to a private IP', addresses: [] };
    }

    return { ok: true, addresses: addresses.map((addr) => addr.address) };
  } catch {
    return { ok: false, reason: 'Hostname resolution failed', addresses: [] };
  }
}

export async function validateWebhookUrl(
  url: string
): Promise<{ ok: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URL must not include credentials' };
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    return { ok: false, reason: 'URL must include a hostname' };
  }

  const resolved = await resolveSafeWebhookHostname(hostname);
  return resolved.ok ? { ok: true } : { ok: false, reason: resolved.reason };
}

export interface WebhookSendRequestOptions {
  url: string;
  payload: string;
  headers: Record<string, string>;
}

export interface WebhookSendRequestResult {
  ok: boolean;
  blocked: boolean;
  responseTime: number;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}

export async function sendWebhookRequest(
  options: WebhookSendRequestOptions
): Promise<WebhookSendRequestResult> {
  const startTime = Date.now();
  const validation = await validateWebhookUrl(options.url);
  if (!validation.ok) {
    return {
      ok: false,
      blocked: true,
      responseTime: Date.now() - startTime,
      error: validation.reason || 'Webhook URL blocked',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

  try {
    const response = await fetch(
      options.url,
      {
        method: 'POST',
        headers: options.headers,
        body: options.payload,
        signal: controller.signal,
        ...WEBHOOK_FETCH_OPTIONS,
      } as RequestInit
    );

    const responseBody = await response.text().catch(() => '');
    const responseTime = Date.now() - startTime;

    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        blocked: false,
        statusCode: response.status,
        responseBody: truncateWebhookResponseBody(responseBody),
        responseTime,
        error: 'Redirect responses are not allowed for webhook delivery',
      };
    }

    return {
      ok: response.ok,
      blocked: false,
      statusCode: response.status,
      responseBody: truncateWebhookResponseBody(responseBody),
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      blocked: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
