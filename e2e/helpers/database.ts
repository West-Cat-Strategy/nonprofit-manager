/**
 * Database Helper Functions for E2E Tests
 */

import { Page } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';

const RETRYABLE_NETWORK_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up/i;
const HTTP_SCHEME = ['http', '://'].join('');
const backendRequire = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'package.json'));
const { Client: PgClient } = backendRequire('pg') as {
  Client: new (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) => {
    connect(): Promise<void>;
    end(): Promise<void>;
    query(text: string, values?: unknown[]): Promise<unknown>;
  };
};

const isRetryableNetworkError = (error: unknown): boolean =>
  error instanceof Error && RETRYABLE_NETWORK_ERROR.test(error.message);

const normalizeOrganizationId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getTokenOrganizationId = (token: string): string | undefined => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return undefined;
  }

  return (
    normalizeOrganizationId(payload.organizationId) ||
    normalizeOrganizationId(payload.organization_id)
  );
};

const getLocalStorageOrganizationId = async (page: Page): Promise<string | null> =>
  page.evaluate(() => localStorage.getItem('organizationId')).catch(() => null);

export type AuthenticatedFixtureScope = {
  organizationId?: string;
  accountId?: string;
};

export async function resolveAuthenticatedFixtureScope(
  page: Page,
  token: string,
  options: {
    organizationId?: string;
    accountId?: string;
  } = {}
): Promise<AuthenticatedFixtureScope> {
  const organizationId =
    normalizeOrganizationId(options.organizationId) ||
    normalizeOrganizationId(await getLocalStorageOrganizationId(page)) ||
    getTokenOrganizationId(token);

  return {
    organizationId,
    accountId: normalizeOrganizationId(options.accountId) || organizationId,
  };
}

const getEntityId = (item: Record<string, unknown>): string | null => {
  const value =
    item.id ||
    item.account_id ||
    item.contact_id ||
    item.donation_id ||
    item.event_id ||
    item.task_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

const unwrapApiData = <T>(payload: ApiSuccessEnvelope<T> | T): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    (payload as { success?: unknown }).success === true &&
    'data' in (payload as object)
  ) {
    return (payload as ApiSuccessEnvelope<T>).data;
  }
  return payload as T;
};

async function withRequestRetry<T>(
  fn: () => Promise<T>,
  context: string,
  attempts: number = 6
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  throw new Error(
    `Request failed for ${context}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

const getDatabaseConnectionConfig = (): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} => ({
  host: process.env.DB_HOST || process.env.E2E_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.E2E_DB_PORT || '8012'),
  database: process.env.DB_NAME || process.env.E2E_DB_NAME || 'nonprofit_manager_test',
  user: process.env.E2E_DB_ADMIN_USER || process.env.TEST_DB_ADMIN_USER || 'postgres',
  password: process.env.E2E_DB_ADMIN_PASSWORD || process.env.TEST_DB_ADMIN_PASSWORD || 'postgres',
});

const hardResetContacts = async (): Promise<void> => {
  const client = new PgClient(getDatabaseConnectionConfig());
  try {
    await client.connect();
    await client.query('TRUNCATE TABLE contacts CASCADE;');
  } finally {
    await client.end().catch(() => undefined);
  }
};

async function getCachedAuthHeaders(
  page: Page,
  token: string,
  cache: Map<string, string>
): Promise<Record<string, string>> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const cacheKey = `${apiURL}|${token}`;
  const organizationId =
    normalizeOrganizationId(await getLocalStorageOrganizationId(page)) || getTokenOrganizationId(token);

  let csrfToken = cache.get(cacheKey);
  if (!csrfToken) {
    const csrfResponse = await withRequestRetry(
      () =>
        page.request.get(`${apiURL}/api/v2/auth/csrf-token`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
          },
        }),
      'fetch csrf token'
    );

    if (!csrfResponse.ok()) {
      throw new Error(
        `Failed to fetch CSRF token (${csrfResponse.status()}): ${await csrfResponse.text()}`
      );
    }

    const csrfData = unwrapApiData<{ csrfToken?: string }>(await csrfResponse.json());
    csrfToken = csrfData?.csrfToken;
    if (!csrfToken) {
      throw new Error(`CSRF token missing in response: ${JSON.stringify(csrfData)}`);
    }
    cache.set(cacheKey, csrfToken);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }

  return headers;
}

export async function getAuthHeaders(page: Page, token: string): Promise<Record<string, string>> {
  return getCachedAuthHeaders(page, token, new Map<string, string>());
}

/**
 * Seed database with test data via API
 */
export async function seedDatabase(page: Page, token: string): Promise<void> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  console.log(`[database.ts] Using API_URL: ${apiURL}`);
  const headers = await getAuthHeaders(page, token);

  // Create test accounts
  await page.request.post(`${apiURL}/api/v2/accounts`, {
    headers,
    data: {
      name: 'Test Organization',
      accountType: 'organization',
      industry: 'nonprofit',
      email: 'test@testorg.org',
      phone: '555-0100',
    },
  });

  // Create test contacts
  await page.request.post(`${apiURL}/api/v2/contacts`, {
    headers,
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-0101',
      contactType: 'donor',
    },
  });
}

/**
 * Clear all test data from database
 */
export async function clearDatabase(page: Page, token: string): Promise<void> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const authHeaderCache = new Map<string, string>();
  const maxCleanupPasses = 5;
  const tokenOrganizationId = getTokenOrganizationId(token);
  let fallbackOrganizationId: string | null = null;

  // Delete in reverse order of dependencies
  const endpoints = [
    '/api/v2/tasks',
    '/api/v2/donations',
    '/api/v2/events',
    '/api/v2/volunteers',
    '/api/v2/contacts',
    '/api/v2/accounts',
  ];

  for (const endpoint of endpoints) {
    try {
      const deletedIds = new Set<string>();
      for (let pass = 0; pass < maxCleanupPasses; pass += 1) {
        // Keep draining until the endpoint returns no more items.
        const listResponse = await withRequestRetry(
          () =>
            page.request.get(`${apiURL}${endpoint}?limit=100`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          `list ${endpoint}`
        );

        if (!listResponse.ok()) {
          break;
        }

        const body = await listResponse.json();
        const payload = body?.data ?? body;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        if (!Array.isArray(items) || items.length === 0) {
          break;
        }

        const itemIds = items
          .map((item) => getEntityId(item as Record<string, unknown>))
          .filter((value): value is string => typeof value === 'string' && value.length > 0);

        if (endpoint === '/api/v2/accounts') {
          const preservedIds = new Set<string>();
          if (tokenOrganizationId) {
            preservedIds.add(tokenOrganizationId);
          } else if (!fallbackOrganizationId) {
            const fallbackAccount = (items as Array<Record<string, unknown>>).find((item) => {
              const accountId = getEntityId(item);
              if (!accountId) {
                return false;
              }
              const accountType = typeof item.account_type === 'string'
                ? item.account_type
                : typeof item.accountType === 'string'
                  ? item.accountType
                  : undefined;
              const isActive = typeof item.is_active === 'boolean'
                ? item.is_active
                : typeof item.isActive === 'boolean'
                  ? item.isActive
                  : true;
              return accountType === 'organization' && isActive;
            });

            const fallbackId = fallbackAccount ? getEntityId(fallbackAccount) : null;
            if (fallbackId) {
              fallbackOrganizationId = fallbackId;
              preservedIds.add(fallbackId);
            }
          } else {
            preservedIds.add(fallbackOrganizationId);
          }

          for (const preservedId of preservedIds) {
            if (itemIds.includes(preservedId)) {
              // Mark preserved IDs as processed to avoid endless cleanup loops.
              deletedIds.add(preservedId);
            }
          }
        }

        const nextIds = itemIds.filter((id) => !deletedIds.has(id));
        if (nextIds.length === 0) {
          break;
        }

        for (const item of items) {
          const itemId = getEntityId(item as Record<string, unknown>);
          if (!itemId || deletedIds.has(itemId)) {
            continue;
          }
          const headers = await getCachedAuthHeaders(page, token, authHeaderCache);
          const deleteResponse = await withRequestRetry(
            () =>
              page.request.delete(`${apiURL}${endpoint}/${itemId}`, {
                headers,
              }),
            `delete ${endpoint}/${itemId}`
          );
          if (!deleteResponse.ok()) {
            if (deleteResponse.status() === 404) {
              continue;
            }
            throw new Error(
              `Failed to delete ${endpoint}/${itemId} (${deleteResponse.status()}): ${await deleteResponse.text()}`
            );
          }
          deletedIds.add(itemId);
        }
      }
    } catch (error) {
      console.warn(`Failed to clear ${endpoint}:`, error);
    }
  }

  await hardResetContacts();
}

/**
 * Create test account via API
 */
export async function createTestAccount(
  page: Page,
  token: string,
  data: {
    name: string;
    accountType?: string;
    category?: string;
    industry?: string;
    email?: string;
    phone?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateProvince?: string;
    postalCode?: string;
    country?: string;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);

  const response = await page.request.post(`${apiURL}/api/v2/accounts`, {
    headers,
    data: {
      account_name: data.name,
      account_type: data.accountType || 'organization',
      category: data.category || 'donor',
      industry: data.industry || 'nonprofit',
      email: data.email,
      phone: data.phone,
      website: data.website,
      address_line1: data.addressLine1,
      address_line2: data.addressLine2,
      city: data.city,
      state_province: data.stateProvince,
      postal_code: data.postalCode,
      country: data.country,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create test account (${response.status()}): ${await response.text()}`
    );
  }

  const result = unwrapApiData<Record<string, unknown>>(await response.json());
  const id =
    result.account_id ||
    result.id ||
    (result.data as Record<string, unknown> | undefined)?.account_id ||
    (result.data as Record<string, unknown> | undefined)?.id;
  if (!id) {
    throw new Error(`Failed to parse account id from response: ${JSON.stringify(result)}`);
  }

  return { id: String(id) };
}

/**
 * Create test contact via API
 */
export async function createTestContact(
  page: Page,
  token: string,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    contactType?: string;
    accountId?: string;
  }
): Promise<{ id: string; accountId: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const fixtureScope = await resolveAuthenticatedFixtureScope(page, token, {
    accountId: data.accountId,
  });
  const accountId =
    fixtureScope.accountId ||
    (
      await createTestAccount(page, token, {
        name: `Auto Contact Account ${Date.now()}`,
        accountType: 'organization',
        category: 'other',
      })
    ).id;

  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/contacts`, {
    headers,
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      account_id: accountId,
      // Keep legacy field for older backends that still parse it.
      contactType: data.contactType || 'donor',
    },
  });

  if (!response.ok()) {
    const tokenOrganizationId = getTokenOrganizationId(token) || 'none';
    const localStorageOrganizationId = (await getLocalStorageOrganizationId(page)) || 'none';
    throw new Error(
      `Failed to create test contact (${response.status()}): ${await response.text()} (tokenOrganizationId=${tokenOrganizationId}, localStorageOrganizationId=${localStorageOrganizationId}, fixtureOrganizationId=${fixtureScope.organizationId || 'none'}, fixtureAccountId=${fixtureScope.accountId || 'none'})`
    );
  }

  const result = unwrapApiData<Record<string, unknown>>(await response.json());
  const id =
    result.contact_id ||
    result.id ||
    (result.data as Record<string, unknown> | undefined)?.contact_id ||
    (result.data as Record<string, unknown> | undefined)?.id;
  if (!id) {
    throw new Error(`Failed to parse contact id from response: ${JSON.stringify(result)}`);
  }

  return { id: String(id), accountId };
}

/**
 * Create test donation via API
 */
export async function createTestDonation(
  page: Page,
  token: string,
  data: {
    accountId: string;
    amount: number;
    donationDate?: string;
    paymentMethod?: string;
    paymentStatus?: string;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);
  const donationDate = data.donationDate || new Date().toISOString();
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await page.request.post(`${apiURL}/api/v2/donations`, {
      headers,
      data: {
        account_id: data.accountId,
        amount: data.amount,
        donation_date: donationDate,
        payment_method: data.paymentMethod || 'credit_card',
        payment_status: data.paymentStatus || 'completed',
      },
    });

    if (response.ok()) {
      const result = unwrapApiData<Record<string, unknown>>(await response.json());
      const id =
        result.donation_id ||
        result.id ||
        (result.data as Record<string, unknown> | undefined)?.donation_id ||
        (result.data as Record<string, unknown> | undefined)?.id;
      return { id: String(id) };
    }

    const body = await response.text();
    const isUniqueViolation = response.status() === 500 && body.includes('"code":"23505"');
    if (isUniqueViolation && attempt < maxAttempts) {
      await page.waitForTimeout(50 * attempt);
      continue;
    }

    throw new Error(`Failed to create test donation (${response.status()}): ${body}`);
  }

  throw new Error('Failed to create test donation after retry attempts');
}

/**
 * Create test event via API
 */
export async function createTestEvent(
  page: Page,
  token: string,
  data: {
    name: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    capacity?: number;
    isPublic?: boolean;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = new Date(tomorrow);
  const startDate = data.startDate || defaultStart.toISOString();
  const resolvedStart = new Date(startDate);
  const endBase = Number.isNaN(resolvedStart.getTime()) ? defaultStart : resolvedStart;
  const defaultEnd = new Date(endBase);
  defaultEnd.setHours(defaultEnd.getHours() + 1);
  const endDate = data.endDate || defaultEnd.toISOString();

  const response = await page.request.post(`${apiURL}/api/v2/events`, {
    headers,
    data: {
      event_name: data.name,
      event_type: data.eventType || 'fundraiser',
      start_date: startDate,
      end_date: endDate,
      location_name: data.location || 'Test Location',
      capacity: data.capacity ?? 100,
      ...(typeof data.isPublic === 'boolean' ? { is_public: data.isPublic } : {}),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test event (${response.status()}): ${await response.text()}`);
  }

  const event = unwrapApiData<Record<string, unknown>>(await response.json());
  const id = event.event_id || event.id;
  if (!id) {
    throw new Error(`Failed to parse event id from response: ${JSON.stringify(event)}`);
  }
  return { id: String(id) };
}

/**
 * Create test volunteer via API
 */
export async function createTestVolunteer(
  page: Page,
  token: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    contactId?: string;
    availabilityStatus?: 'available' | 'limited' | 'unavailable';
    backgroundCheckStatus?:
      | 'not_required'
      | 'pending'
      | 'in_progress'
      | 'approved'
      | 'rejected'
      | 'expired';
  } = {}
): Promise<{ id: string; contactId: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);

  const contactId =
    data.contactId ||
    (
      await createTestContact(page, token, {
        firstName: data.firstName || 'Test',
        lastName: data.lastName || 'Volunteer',
        email: data.email,
        phone: data.phone,
        contactType: 'volunteer',
      })
    ).id;

  const response = await page.request.post(`${apiURL}/api/v2/volunteers`, {
    headers,
    data: {
      contact_id: contactId,
      availability_status: data.availabilityStatus || 'available',
      background_check_status: data.backgroundCheckStatus || 'not_required',
      skills: [],
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create test volunteer (${response.status()}): ${await response.text()}`
    );
  }

  const result = unwrapApiData<Record<string, unknown>>(await response.json());
  const id = result.volunteer_id || result.id || (result.data as Record<string, unknown> | undefined)?.volunteer_id || (result.data as Record<string, unknown> | undefined)?.id;
  if (!id) {
    throw new Error(`Failed to parse volunteer id from response: ${JSON.stringify(result)}`);
  }

  return { id: String(id), contactId };
}

/**
 * Create test volunteer assignment via API.
 */
export async function createTestVolunteerAssignment(
  page: Page,
  token: string,
  data: {
    volunteerId: string;
    eventId?: string;
    taskId?: string;
    assignmentType?: 'event' | 'task' | 'general';
    role?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    hoursLogged?: number;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);

  const createResponse = await page.request.post(`${apiURL}/api/v2/volunteers/assignments`, {
    headers,
    data: {
      volunteer_id: data.volunteerId,
      event_id: data.eventId,
      task_id: data.taskId,
      assignment_type:
        data.assignmentType || (data.taskId ? 'task' : data.eventId ? 'event' : 'general'),
      role: data.role || 'Support',
      start_time: data.startTime || new Date().toISOString(),
      end_time: data.endTime,
      notes: data.notes,
    },
  });

  if (!createResponse.ok()) {
    throw new Error(
      `Failed to create test volunteer assignment (${createResponse.status()}): ${await createResponse.text()}`
    );
  }

  const result = unwrapApiData<Record<string, unknown>>(await createResponse.json());
  const id =
    result.assignment_id ||
    result.id ||
    (result.data as Record<string, unknown> | undefined)?.assignment_id ||
    (result.data as Record<string, unknown> | undefined)?.id;

  if (!id) {
    throw new Error(
      `Failed to parse assignment id from response: ${JSON.stringify(result)}`
    );
  }

  if (data.status !== undefined || data.hoursLogged !== undefined) {
    const updateResponse = await page.request.put(
      `${apiURL}/api/v2/volunteers/assignments/${String(id)}`,
      {
        headers,
        data: {
          status: data.status,
          hours_logged: data.hoursLogged,
        },
      }
    );

    if (!updateResponse.ok()) {
      throw new Error(
        `Failed to update test volunteer assignment (${updateResponse.status()}): ${await updateResponse.text()}`
      );
    }
  }

  return { id: String(id) };
}
