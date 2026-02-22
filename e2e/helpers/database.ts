/**
 * Database Helper Functions for E2E Tests
 */

import { Page } from '@playwright/test';

const RETRYABLE_NETWORK_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up/i;
const HTTP_SCHEME = ['http', '://'].join('');

const isRetryableNetworkError = (error: unknown): boolean =>
  error instanceof Error && RETRYABLE_NETWORK_ERROR.test(error.message);

async function withRequestRetry<T>(
  fn: () => Promise<T>,
  context: string,
  attempts: number = 3
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
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }

  throw new Error(
    `Request failed for ${context}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function getCachedAuthHeaders(
  page: Page,
  token: string,
  cache: Map<string, string>
): Promise<Record<string, string>> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const cacheKey = `${apiURL}|${token}`;
  const organizationId = await page
    .evaluate(() => localStorage.getItem('organizationId'))
    .catch(() => null);

  let csrfToken = cache.get(cacheKey);
  if (!csrfToken) {
    const csrfResponse = await withRequestRetry(
      () =>
        page.request.get(`${apiURL}/api/auth/csrf-token`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      'fetch csrf token'
    );

    if (!csrfResponse.ok()) {
      throw new Error(
        `Failed to fetch CSRF token (${csrfResponse.status()}): ${await csrfResponse.text()}`
      );
    }

    const csrfData = await csrfResponse.json();
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
  await page.request.post(`${apiURL}/api/accounts`, {
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
  await page.request.post(`${apiURL}/api/contacts`, {
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
  const maxCleanupPasses = 20;

  // Delete in reverse order of dependencies
  const endpoints = [
    '/api/tasks',
    '/api/donations',
    '/api/v2/events',
    '/api/volunteers',
    '/api/contacts',
    '/api/accounts',
  ];

  for (const endpoint of endpoints) {
    try {
      for (let pass = 0; pass < maxCleanupPasses; pass += 1) {
        // Keep draining until the endpoint returns no more items.
        const listResponse = await withRequestRetry(
          () =>
            page.request.get(`${apiURL}${endpoint}?limit=200`, {
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

        for (const item of items) {
          const itemId =
            item.id ||
            item.account_id ||
            item.contact_id ||
            item.donation_id ||
            item.event_id ||
            item.task_id;
          if (!itemId) {
            continue;
          }
          const headers = await getCachedAuthHeaders(page, token, authHeaderCache);
          await withRequestRetry(
            () =>
              page.request.delete(`${apiURL}${endpoint}/${itemId}`, {
                headers,
              }),
            `delete ${endpoint}/${itemId}`
          );
        }
      }
    } catch (error) {
      console.warn(`Failed to clear ${endpoint}:`, error);
    }
  }
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
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);

  const response = await page.request.post(`${apiURL}/api/accounts`, {
    headers,
    data: {
      account_name: data.name,
      account_type: data.accountType || 'organization',
      category: data.category || 'donor',
      industry: data.industry || 'nonprofit',
      email: data.email,
      phone: data.phone,
      website: data.website,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create test account (${response.status()}): ${await response.text()}`
    );
  }

  const result = await response.json();
  const id = result.account_id || result.id || result.data?.account_id || result.data?.id;
  if (!id) {
    throw new Error(`Failed to parse account id from response: ${JSON.stringify(result)}`);
  }

  return { id };
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
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const accountId = data.accountId || (
    await createTestAccount(page, token, {
      name: `Auto Contact Account ${Date.now()}`,
      accountType: 'organization',
      category: 'other',
    })
  ).id;

  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/contacts`, {
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
    throw new Error(
      `Failed to create test contact (${response.status()}): ${await response.text()}`
    );
  }

  const result = await response.json();
  const id = result.contact_id || result.id || result.data?.contact_id || result.data?.id;
  if (!id) {
    throw new Error(`Failed to parse contact id from response: ${JSON.stringify(result)}`);
  }

  return { id };
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
  const response = await page.request.post(`${apiURL}/api/donations`, {
    headers,
    data: {
      account_id: data.accountId,
      amount: data.amount,
      donation_date: donationDate,
      payment_method: data.paymentMethod || 'credit_card',
      payment_status: data.paymentStatus || 'completed',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test donation (${response.status()}): ${await response.text()}`);
  }

  const result = await response.json();
  return { id: result.donation_id || result.id };
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
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;
  const headers = await getAuthHeaders(page, token);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = data.startDate || tomorrow.toISOString();
  const endDate = data.endDate || tomorrow.toISOString();

  const response = await page.request.post(`${apiURL}/api/v2/events`, {
    headers,
    data: {
      event_name: data.name,
      event_type: data.eventType || 'fundraiser',
      start_date: startDate,
      end_date: endDate,
      location_name: data.location || 'Test Location',
      capacity: data.capacity ?? 100,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test event (${response.status()}): ${await response.text()}`);
  }

  const result = await response.json();
  const event = result?.data ?? result;
  return { id: event.event_id || event.id };
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
      | 'not_started'
      | 'pending'
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

  const response = await page.request.post(`${apiURL}/api/volunteers`, {
    headers,
    data: {
      contact_id: contactId,
      availability_status: data.availabilityStatus || 'available',
      background_check_status: data.backgroundCheckStatus || 'not_started',
      skills: [],
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create test volunteer (${response.status()}): ${await response.text()}`
    );
  }

  const result = await response.json();
  const id = result.volunteer_id || result.id || result.data?.volunteer_id || result.data?.id;
  if (!id) {
    throw new Error(`Failed to parse volunteer id from response: ${JSON.stringify(result)}`);
  }

  return { id, contactId };
}
