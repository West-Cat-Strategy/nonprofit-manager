/**
 * Mautic Service
 * Handles self-hosted newsletter audience syncing against a Mautic instance.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
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

interface MauticContact {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  tags?: string[];
}

const mauticBaseUrl = process.env.MAUTIC_BASE_URL?.trim().replace(/\/+$/, '');
const mauticUsername = process.env.MAUTIC_USERNAME?.trim();
const mauticPassword = process.env.MAUTIC_PASSWORD;

let isConfigured = false;

function initializeMautic(): void {
  if (!mauticBaseUrl || !mauticUsername || !mauticPassword) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('Mautic is not configured. Set MAUTIC_BASE_URL, MAUTIC_USERNAME, and MAUTIC_PASSWORD.');
    }
    return;
  }

  isConfigured = true;
  logger.info('Mautic client initialized');
}

initializeMautic();

export function isMauticConfigured(): boolean {
  return isConfigured;
}

const buildAuthHeader = (): string => {
  const credentials = `${mauticUsername}:${mauticPassword}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const buildUrl = (path: string): string => {
  if (!mauticBaseUrl) {
    throw new Error('Mautic is not configured');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${mauticBaseUrl}${normalizedPath}`;
};

const extractCollection = <T>(payload: unknown): T[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as {
    items?: unknown;
    contacts?: unknown;
    segments?: unknown;
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
  return [];
};

async function mauticRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!isConfigured) {
    throw new Error('Mautic is not configured');
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: buildAuthHeader(),
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

async function findContactByEmail(email: string): Promise<MauticContact | null> {
  const response = await mauticRequest<{ contacts?: MauticContact[]; items?: MauticContact[] }>(
    `/api/contacts?search=${encodeURIComponent(email)}`
  );
  const matches = extractCollection<MauticContact>(response).filter(
    (contact) => contact.email?.toLowerCase() === email.toLowerCase()
  );
  return matches[0] ? mapContact(matches[0]) : null;
}

async function upsertContact(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tags?: string[];
}): Promise<MauticContact> {
  const existing = await findContactByEmail(input.email);
  const payload = {
    firstname: input.firstName,
    lastname: input.lastName,
    email: input.email,
    mobile: input.phone || '',
    tags: input.tags || [],
  };

  if (existing) {
    const updated = await mauticRequest<MauticContact>(`/api/contacts/${existing.id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapContact({ ...existing, ...updated });
  }

  const created = await mauticRequest<MauticContact>('/api/contacts/new', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapContact(created);
}

async function assignContactToSegment(segmentId: string, contactId: string): Promise<void> {
  await mauticRequest<void>(`/api/segments/${segmentId}/contact/${contactId}/add`, {
    method: 'POST',
  });
}

export async function getStatus(): Promise<MauticStatus> {
  if (!isConfigured) {
    return { configured: false };
  }

  try {
    const segments = await getSegments();
    return {
      configured: true,
      baseUrl: mauticBaseUrl,
      segmentCount: segments.length,
    };
  } catch (error) {
    logger.error('Failed to get Mautic status', { error });
    return { configured: false };
  }
}

export async function getSegments(): Promise<MauticSegment[]> {
  if (!isConfigured) {
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
    }>('/api/segments?limit=100');

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

export async function syncContact(request: SyncContactRequest): Promise<SyncResult> {
  if (!isConfigured) {
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

    const existingContact = await findContactByEmail(contact.email);
    const action = existingContact ? 'updated' : 'added';
    const mauticContact = await upsertContact({
      email: contact.email,
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      phone: contact.phone || undefined,
      tags: request.tags || [],
    });

    if (request.listId) {
      await assignContactToSegment(request.listId, mauticContact.id);
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

export async function bulkSyncContacts(request: BulkSyncRequest): Promise<BulkSyncResponse> {
  if (!isConfigured) {
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
      syncContact({
        contactId,
        listId: request.listId,
        tags: request.tags,
      })
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
  syncContact,
  bulkSyncContacts,
};
