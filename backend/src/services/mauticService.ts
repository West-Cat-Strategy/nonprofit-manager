/**
 * Mautic Service
 * Handles self-hosted newsletter audience syncing against a Mautic instance.
 */

import dns from 'dns/promises';
import net from 'net';
import pool from '@config/database';
import { logger } from '@config/logger';
import type { WebsiteMauticSettings } from '@app-types/publishing';
import type {
  BulkSyncRequest,
  BulkSyncResponse,
  SyncContactRequest,
  SyncResult,
} from '@app-types/mailchimp';

export interface MauticStatus {
  configured: boolean;
  baseUrl?: string;
  segmentCount?: number;
}

export interface MauticSegment {
  id: string;
  name: string;
  memberCount: number;
}

export interface MauticEmail {
  id: string;
  name: string;
  subject?: string;
  preheaderText?: string;
  customHtml?: string;
  plainText?: string;
  isPublished: boolean;
  emailType?: string;
  sentCount?: number;
  readCount?: number;
  lists?: string[];
  dateAdded?: string;
  dateModified?: string;
  publishUp?: string | null;
}

interface MauticContact {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  tags?: string[];
}

export type MauticClientConfig = Pick<WebsiteMauticSettings, 'baseUrl' | 'username' | 'password'>;

interface MauticRuntimeConfig {
  baseUrl: string;
  username: string;
  password: string;
  source: 'env' | 'site';
}

type MauticConfigResolution =
  | { config: MauticRuntimeConfig; error?: undefined }
  | { config: null; error?: string };

type NormalizedMauticConfig =
  | { state: 'configured'; config: MauticRuntimeConfig }
  | { state: 'invalid'; error: string }
  | { state: 'incomplete' };

const PRIVATE_HOSTNAME_SUFFIXES = ['.localhost', '.local'];
const BLOCKED_HOSTNAMES = new Set(['localhost']);

const cleanRequiredString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

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
    return isPrivateIpv4(normalized.replace('::ffff:', ''));
  }

  return false;
};

const isPrivateIp = (ip: string): boolean => {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
};

const isPrivateHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  return PRIVATE_HOSTNAME_SUFFIXES.some((suffix) => lower.endsWith(suffix));
};

const normalizeHostname = (hostname: string): string =>
  hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

const normalizeMauticBaseUrl = (value: unknown): { baseUrl?: string; error?: string } => {
  const rawBaseUrl = cleanRequiredString(value);
  if (!rawBaseUrl) {
    return {};
  }

  let parsed: URL;
  try {
    parsed = new URL(rawBaseUrl);
  } catch {
    return { error: 'Mautic base URL is invalid' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Mautic base URL must use http or https' };
  }

  if (parsed.username || parsed.password) {
    return { error: 'Mautic base URL must not include credentials' };
  }

  if (!parsed.hostname) {
    return { error: 'Mautic base URL must include a hostname' };
  }

  const hostname = normalizeHostname(parsed.hostname);

  if (isPrivateHostname(hostname)) {
    return { error: 'Mautic base URL host is not allowed' };
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    return { error: 'Mautic base URL IP address is not allowed' };
  }

  if (parsed.search || parsed.hash) {
    return { error: 'Mautic base URL must not include query or fragment values' };
  }

  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return { baseUrl: `${parsed.origin}${pathname}` };
};

const normalizeClientConfig = (
  config: MauticClientConfig | undefined,
  source: MauticRuntimeConfig['source']
): NormalizedMauticConfig => {
  const baseUrlValue = cleanRequiredString(config?.baseUrl);
  const username = cleanRequiredString(config?.username);
  const password = cleanRequiredString(config?.password);

  if (!baseUrlValue || !username || !password) {
    return { state: 'incomplete' };
  }

  const normalizedBaseUrl = normalizeMauticBaseUrl(baseUrlValue);
  if (!normalizedBaseUrl.baseUrl) {
    return {
      state: 'invalid',
      error: normalizedBaseUrl.error || 'Mautic base URL is not allowed',
    };
  }

  return {
    state: 'configured',
    config: {
      baseUrl: normalizedBaseUrl.baseUrl,
      username,
      password,
      source,
    },
  };
};

const getEnvMauticConfig = (): MauticClientConfig => ({
  baseUrl: process.env.MAUTIC_BASE_URL,
  username: process.env.MAUTIC_USERNAME,
  password: process.env.MAUTIC_PASSWORD,
});

const resolveMauticRuntimeConfig = (config?: MauticClientConfig): MauticConfigResolution => {
  const scoped = normalizeClientConfig(config, 'site');
  if (scoped.state === 'configured') {
    return { config: scoped.config };
  }
  if (scoped.state === 'invalid') {
    return { config: null, error: scoped.error };
  }

  const env = normalizeClientConfig(getEnvMauticConfig(), 'env');
  if (env.state === 'configured') {
    return { config: env.config };
  }
  if (env.state === 'invalid') {
    return { config: null, error: env.error };
  }

  return { config: null };
};

async function resolveSafeMauticHostname(
  hostname: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!hostname) {
    return { ok: false, reason: 'URL must include a hostname' };
  }

  if (isPrivateHostname(hostname)) {
    return { ok: false, reason: 'Host is not allowed' };
  }

  if (net.isIP(hostname)) {
    return isPrivateIp(hostname)
      ? { ok: false, reason: 'IP address is not allowed' }
      : { ok: true };
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
      return { ok: false, reason: 'Hostname did not resolve' };
    }

    if (addresses.some((address) => isPrivateIp(address.address))) {
      return { ok: false, reason: 'Hostname resolves to a private IP' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'Hostname resolution failed' };
  }
}

async function assertMauticFetchAllowed(config: MauticRuntimeConfig): Promise<void> {
  const parsed = new URL(config.baseUrl);
  const resolved = await resolveSafeMauticHostname(normalizeHostname(parsed.hostname));
  if (!resolved.ok) {
    throw new Error(`Mautic base URL is not allowed: ${resolved.reason || 'Unsafe host'}`);
  }
}

function initializeMautic(): void {
  if (!isMauticConfigured()) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn(
        'Mautic is not configured. Set MAUTIC_BASE_URL, MAUTIC_USERNAME, and MAUTIC_PASSWORD.'
      );
    }
    return;
  }

  logger.info('Mautic client initialized');
}

initializeMautic();

export function isMauticConfigured(config?: MauticClientConfig): boolean {
  return Boolean(resolveMauticRuntimeConfig(config).config);
}

const buildAuthHeader = (config: MauticRuntimeConfig): string => {
  const credentials = `${config.username}:${config.password}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const buildUrl = (config: MauticRuntimeConfig, path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl}${normalizedPath}`;
};

const extractCollection = <T>(payload: unknown): T[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as {
    items?: unknown;
    contacts?: unknown;
    segments?: unknown;
    emails?: unknown;
  };

  if (Array.isArray(record.items)) {
    return record.items as T[];
  }
  if (Array.isArray(record.contacts)) {
    return record.contacts as T[];
  }
  if (Array.isArray(record.segments)) {
    return record.segments as T[];
  }
  if (Array.isArray(record.emails)) {
    return record.emails as T[];
  }
  if (record.emails && typeof record.emails === 'object') {
    return Object.values(record.emails as Record<string, unknown>) as T[];
  }
  return [];
};

async function mauticRequest<T>(
  path: string,
  init: RequestInit = {},
  inputConfig?: MauticClientConfig
): Promise<T> {
  const resolved = resolveMauticRuntimeConfig(inputConfig);
  if (!resolved.config) {
    throw new Error(resolved.error || 'Mautic is not configured');
  }

  await assertMauticFetchAllowed(resolved.config);

  const response = await fetch(buildUrl(resolved.config, path), {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: buildAuthHeader(resolved.config),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `Mautic request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''})${
        details ? `: ${details}` : ''
      }`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

function mapContact(contact: MauticContact): MauticContact {
  return {
    ...contact,
    email: contact.email,
    tags: contact.tags || [],
  };
}

async function findContactByEmail(
  email: string,
  config?: MauticClientConfig
): Promise<MauticContact | null> {
  const response = await mauticRequest<{ contacts?: MauticContact[]; items?: MauticContact[] }>(
    `/api/contacts?search=${encodeURIComponent(email)}`,
    {},
    config
  );
  const matches = extractCollection<MauticContact>(response).filter(
    (contact) => contact.email?.toLowerCase() === email.toLowerCase()
  );
  return matches[0] ? mapContact(matches[0]) : null;
}

async function upsertContact(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    tags?: string[];
  },
  config?: MauticClientConfig
): Promise<MauticContact> {
  const existing = await findContactByEmail(input.email, config);
  const payload = {
    firstname: input.firstName,
    lastname: input.lastName,
    email: input.email,
    mobile: input.phone || '',
    tags: input.tags || [],
  };

  if (existing) {
    const updated = await mauticRequest<MauticContact>(
      `/api/contacts/${existing.id}/edit`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      config
    );
    return mapContact({ ...existing, ...updated });
  }

  const created = await mauticRequest<MauticContact>(
    '/api/contacts/new',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    config
  );
  return mapContact(created);
}

async function assignContactToSegment(
  segmentId: string,
  contactId: string,
  config?: MauticClientConfig
): Promise<void> {
  await mauticRequest<void>(
    `/api/segments/${segmentId}/contact/${contactId}/add`,
    {
      method: 'POST',
    },
    config
  );
}

export async function getStatus(config?: MauticClientConfig): Promise<MauticStatus> {
  const resolved = resolveMauticRuntimeConfig(config);
  if (!resolved.config) {
    return { configured: false };
  }

  try {
    await assertMauticFetchAllowed(resolved.config);
    const segments = await getSegments(config);
    return {
      configured: true,
      baseUrl: resolved.config.baseUrl,
      segmentCount: segments.length,
    };
  } catch (error) {
    logger.error('Failed to get Mautic status', { error });
    return { configured: false };
  }
}

export async function getSegments(config?: MauticClientConfig): Promise<MauticSegment[]> {
  if (!isMauticConfigured(config)) {
    return [];
  }

  try {
    const response = await mauticRequest<{
      segments?: Array<{
        id: string | number;
        name: string;
        contacts?: number;
        member_count?: number;
      }>;
      items?: Array<{
        id: string | number;
        name: string;
        contacts?: number;
        member_count?: number;
      }>;
    }>('/api/segments?limit=100', {}, config);

    return extractCollection<{
      id: string | number;
      name: string;
      contacts?: number;
      member_count?: number;
    }>(response).map((segment) => ({
      id: String(segment.id),
      name: segment.name,
      memberCount: Number(segment.contacts ?? segment.member_count ?? 0),
    }));
  } catch (error) {
    logger.error('Failed to get Mautic segments', { error });
    throw error;
  }
}

const mapMauticEmail = (email: {
  id: string | number;
  name?: string;
  subject?: string | null;
  preheaderText?: string | null;
  customHtml?: string | null;
  plainText?: string | null;
  isPublished?: boolean | number;
  emailType?: string | null;
  sentCount?: number | string | null;
  readCount?: number | string | null;
  lists?: Array<string | number> | Record<string, unknown> | null;
  dateAdded?: string | null;
  dateModified?: string | null;
  publishUp?: string | null;
}): MauticEmail => {
  const listValues = Array.isArray(email.lists)
    ? email.lists
    : email.lists && typeof email.lists === 'object'
      ? Object.values(email.lists)
      : [];

  return {
    id: String(email.id),
    name: email.name || email.subject || `Mautic email ${email.id}`,
    subject: email.subject || undefined,
    preheaderText: email.preheaderText || undefined,
    customHtml: email.customHtml || undefined,
    plainText: email.plainText || undefined,
    isPublished: email.isPublished === true || email.isPublished === 1,
    emailType: email.emailType || undefined,
    sentCount:
      email.sentCount === undefined || email.sentCount === null
        ? undefined
        : Number(email.sentCount),
    readCount:
      email.readCount === undefined || email.readCount === null
        ? undefined
        : Number(email.readCount),
    lists: listValues
      .map((value) => {
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value);
        }
        if (value && typeof value === 'object' && 'id' in value) {
          return String((value as { id: string | number }).id);
        }
        return undefined;
      })
      .filter((value): value is string => Boolean(value)),
    dateAdded: email.dateAdded || undefined,
    dateModified: email.dateModified || undefined,
    publishUp: email.publishUp ?? null,
  };
};

export async function getEmails(
  config?: MauticClientConfig,
  options: { segmentId?: string; limit?: number } = {}
): Promise<MauticEmail[]> {
  if (!isMauticConfigured(config)) {
    return [];
  }

  const limit = Math.max(1, Math.min(options.limit || 100, 100));
  const params = new URLSearchParams({
    limit: String(limit),
    publishedOnly: 'true',
    orderBy: 'date_modified',
    orderByDir: 'desc',
  });

  try {
    const response = await mauticRequest<{
      emails?: unknown;
      items?: unknown;
    }>(`/api/emails?${params.toString()}`, {}, config);

    const segmentId = options.segmentId?.trim();
    return extractCollection<Parameters<typeof mapMauticEmail>[0]>(response)
      .map((email) => mapMauticEmail(email))
      .filter((email) => email.isPublished)
      .filter((email) => !segmentId || email.lists?.includes(segmentId));
  } catch (error) {
    logger.error('Failed to get Mautic emails', { error });
    throw error;
  }
}

export async function syncContact(
  request: SyncContactRequest,
  config?: MauticClientConfig
): Promise<SyncResult> {
  if (!isMauticConfigured(config)) {
    return {
      contactId: request.contactId,
      email: '',
      success: false,
      action: 'skipped',
      error: 'Mautic is not configured',
    };
  }

  try {
    const result = await pool.query(
      `SELECT id AS contact_id, first_name, last_name, email, phone,
              do_not_email
       FROM contacts WHERE id = $1`,
      [request.contactId]
    );

    if (result.rows.length === 0) {
      return {
        contactId: request.contactId,
        email: '',
        success: false,
        action: 'skipped',
        error: 'Contact not found',
      };
    }

    const contact = result.rows[0] as {
      contact_id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      do_not_email: boolean | null;
    };

    if (!contact.email) {
      return {
        contactId: request.contactId,
        email: '',
        success: false,
        action: 'skipped',
        error: 'Contact has no email address',
      };
    }

    if (contact.do_not_email) {
      return {
        contactId: request.contactId,
        email: contact.email,
        success: false,
        action: 'skipped',
        error: 'Contact has do_not_email flag set',
      };
    }

    const existingContact = await findContactByEmail(contact.email, config);
    const action = existingContact ? 'updated' : 'added';
    const mauticContact = await upsertContact(
      {
        email: contact.email,
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        phone: contact.phone || undefined,
        tags: request.tags || [],
      },
      config
    );

    if (request.listId) {
      await assignContactToSegment(request.listId, mauticContact.id, config);
    }

    logger.info('Contact synced to Mautic', {
      contactId: request.contactId,
      email: contact.email,
      segmentId: request.listId,
      action,
    });

    return {
      contactId: request.contactId,
      email: contact.email,
      success: true,
      action,
    };
  } catch (error) {
    logger.error('Failed to sync contact to Mautic', { error, request });
    return {
      contactId: request.contactId,
      email: '',
      success: false,
      action: 'skipped',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function bulkSyncContacts(
  request: BulkSyncRequest,
  config?: MauticClientConfig
): Promise<BulkSyncResponse> {
  if (!isMauticConfigured(config)) {
    return {
      total: request.contactIds.length,
      added: 0,
      updated: 0,
      skipped: request.contactIds.length,
      errors: 0,
      results: request.contactIds.map((contactId) => ({
        contactId,
        email: '',
        success: false,
        action: 'skipped',
        error: 'Mautic is not configured',
      })),
    };
  }

  const results = await Promise.all(
    request.contactIds.map((contactId) =>
      syncContact(
        {
          contactId,
          listId: request.listId,
          tags: request.tags,
        },
        config
      )
    )
  );

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    if (result.success) {
      if (result.action === 'added') {
        added++;
      } else if (result.action === 'updated') {
        updated++;
      }
      continue;
    }

    if (result.action === 'skipped') {
      skipped++;
    } else {
      errors++;
    }
  }

  return {
    total: request.contactIds.length,
    added,
    updated,
    skipped,
    errors,
    results,
  };
}

export default {
  isMauticConfigured,
  getStatus,
  getSegments,
  getEmails,
  syncContact,
  bulkSyncContacts,
};
