/**
 * Database Helper Functions for E2E Tests
 */

import { Page } from '@playwright/test';

/**
 * Seed database with test data via API
 */
export async function seedDatabase(page: Page, token: string): Promise<void> {
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  // Create test accounts
  await page.request.post(`${apiURL}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
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
    headers: { Authorization: `Bearer ${token}` },
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

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
            await page.request.delete(`${apiURL}${endpoint}/${item.id}`, {
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
    industry?: string;
    email?: string;
    phone?: string;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${apiURL}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      accountType: 'organization',
      industry: 'nonprofit',
      ...data,
    },
  });

  const result = await response.json();
  return { id: result.id };
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${apiURL}/api/contacts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      contactType: 'donor',
      ...data,
    },
  });

  const result = await response.json();
  return { id: result.id };
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${apiURL}/api/donations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      donationDate: new Date().toISOString(),
      paymentMethod: 'credit_card',
      paymentStatus: 'completed',
      ...data,
    },
  });

  const result = await response.json();
  return { id: result.id };
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const response = await page.request.post(`${apiURL}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      eventType: 'fundraiser',
      startDate: tomorrow.toISOString(),
      endDate: tomorrow.toISOString(),
      location: 'Test Location',
      capacity: 100,
      ...data,
    },
  });

  const result = await response.json();
  return { id: result.id };
}
