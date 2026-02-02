/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import { test as base, Page } from '@playwright/test';
import { loginViaAPI, clearAuth } from '../helpers/auth';
import { clearDatabase } from '../helpers/database';

// Test user credentials from environment
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123!@#';

// Extend base test with custom fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  authToken: string;
};

/**
 * Extended test with authenticated page fixture
 *
 * Usage:
 *   test('my test', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/dashboard');
 *     // Page is already logged in
 *   });
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before test
    const { token } = await loginViaAPI(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear auth after test
    await clearAuth(page);
  },

  authToken: async ({ page }, use) => {
    // Setup: Get auth token
    const { token } = await loginViaAPI(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Provide token to test
    await use(token);

    // Teardown: Clear auth
    await clearAuth(page);
  },
});

/**
 * Extended test with authenticated page and clean database
 *
 * Usage:
 *   testWithCleanDB('my test', async ({ authenticatedPage, authToken }) => {
 *     // Database is clean, page is authenticated
 *   });
 */
export const testWithCleanDB = test.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login and clear database
    const { token } = await loginViaAPI(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await clearDatabase(page, token);

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear database and auth
    await clearDatabase(page, token);
    await clearAuth(page);
  },
});

export { expect } from '@playwright/test';
