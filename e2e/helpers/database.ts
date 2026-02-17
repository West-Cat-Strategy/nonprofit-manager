/**
 * Database Helper Functions for E2E Tests
 */

import { Page } from '@playwright/test';

/**
 * Seed database with test data via API
 */
export async function seedDatabase(page: Page, token: string): Promise<void> {
  const apiURL = process.env.API_URL || 'http://localhost:3001';
  console.log(`[database.ts] Using API_URL: ${apiURL}`);

  // Create test accounts
  await page.request.post(`${apiURL}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  // Delete in reverse order of dependencies
  const endpoints = [
    '/api/tasks',
    '/api/donations',
    '/api/events',
    '/api/volunteers',
    '/api/contacts',
    '/api/accounts',
  ];

  for (const endpoint of endpoints) {
    try {
      // Get all items
      const listResponse = await page.request.get(`${apiURL}${endpoint}?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (listResponse.ok()) {
        const data = await listResponse.json();
        const items = data.items || data.data || data;

        // Delete each item
        if (Array.isArray(items)) {
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
            await page.request.delete(`${apiURL}${endpoint}/${itemId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const response = await page.request.post(`${apiURL}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

  const result = await response.json();
  return { id: result.account_id || result.id };
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const response = await page.request.post(`${apiURL}/api/contacts`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      account_id: data.accountId,
      // Keep legacy field for older backends that still parse it.
      contactType: data.contactType || 'donor',
    },
  });

  const result = await response.json();
  return { id: result.contact_id || result.id };
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const donationDate = data.donationDate || new Date().toISOString();
  const response = await page.request.post(`${apiURL}/api/donations`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = data.startDate || tomorrow.toISOString();
  const endDate = data.endDate || tomorrow.toISOString();

  const response = await page.request.post(`${apiURL}/api/events`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
  return { id: result.event_id || result.id };
}
