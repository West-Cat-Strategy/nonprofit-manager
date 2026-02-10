/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import '../helpers/testEnv';
import { test as base, Page } from '@playwright/test';
import { createTestUser, login, loginViaAPI, clearAuth, ensureSetupComplete } from '../helpers/auth';
import { clearDatabase } from '../helpers/database';
import { getSharedTestUser } from '../helpers/testUser';

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
    const { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD } = getSharedTestUser();
    await ensureSetupComplete(page, TEST_USER_EMAIL, TEST_USER_PASSWORD, {
      firstName: 'Test',
      lastName: 'User',
    });
    try {
      await createTestUser(page, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('user already exists')) {
        throw error;
      }
    }
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear auth after test
    await clearAuth(page);
  },

  authToken: async ({ page }, use) => {
    const { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD } = getSharedTestUser();
    await ensureSetupComplete(page, TEST_USER_EMAIL, TEST_USER_PASSWORD, {
      firstName: 'Test',
      lastName: 'User',
    });
    try {
      await createTestUser(page, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('user already exists')) {
        throw error;
      }
    }
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
    const { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD } = getSharedTestUser();
    await ensureSetupComplete(page, TEST_USER_EMAIL, TEST_USER_PASSWORD, {
      firstName: 'Test',
      lastName: 'User',
    });
    try {
      await createTestUser(page, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('user already exists')) {
        throw error;
      }
    }
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
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
