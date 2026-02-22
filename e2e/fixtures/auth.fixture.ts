/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import '../helpers/testEnv';
import { test as base, Page } from '@playwright/test';
import { ensureAdminLoginViaAPI, clearAuth } from '../helpers/auth';
import { clearDatabase } from '../helpers/database';

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
    await ensureAdminLoginViaAPI(page, {
      firstName: 'Test',
      lastName: 'User',
    });
    await page.goto('/dashboard');

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear auth after test
    await clearAuth(page);
  },

  authToken: async ({ page }, use) => {
    const { token } = await ensureAdminLoginViaAPI(page, {
      firstName: 'Test',
      lastName: 'User',
    });

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
    const { token } = await ensureAdminLoginViaAPI(page, {
      firstName: 'Test',
      lastName: 'User',
    });
    await page.goto('/dashboard');
    await clearDatabase(page, token);

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear database and auth
    await clearDatabase(page, token);
    await clearAuth(page);
  },
});

export { expect } from '@playwright/test';
