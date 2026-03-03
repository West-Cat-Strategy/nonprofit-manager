/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import '../helpers/testEnv';
import { test as base, Page } from '@playwright/test';
import { ensureLoginViaAPI, clearAuth, applyAuthTokenState } from '../helpers/auth';
import { clearDatabase } from '../helpers/database';
import { getSharedTestUser } from '../helpers/testUser';

// Extend base test with custom fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  authToken: string;
};

type CachedAuthState = {
  token: string;
  organizationId?: string;
};

let cachedAuthState: CachedAuthState | null = null;

const normalizeOrganizationId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const ensureSharedAuthState = async (page: Page): Promise<CachedAuthState> => {
  if (cachedAuthState?.token) {
    await applyAuthTokenState(page, cachedAuthState.token, cachedAuthState.organizationId);
    return cachedAuthState;
  }

  const sharedUser = getSharedTestUser();
  const login = await ensureLoginViaAPI(page, sharedUser.email, sharedUser.password, {
    firstName: 'Test',
    lastName: 'User',
  });
  const loginRecord = login as { organizationId?: unknown; user?: Record<string, unknown> };
  cachedAuthState = {
    token: login.token,
    organizationId:
      normalizeOrganizationId(loginRecord.organizationId) ||
      normalizeOrganizationId(loginRecord.user?.organizationId) ||
      normalizeOrganizationId(loginRecord.user?.organization_id),
  };
  return cachedAuthState;
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
    await ensureSharedAuthState(page);

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear auth after test
    await clearAuth(page);
  },

  authToken: async ({ page }, use) => {
    const { token } = await ensureSharedAuthState(page);

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
    const { token } = await ensureSharedAuthState(page);
    await clearDatabase(page, token);

    // Provide authenticated page to test
    await use(page);

    // Teardown: Clear database and auth
    await clearDatabase(page, token);
    await clearAuth(page);
  },
});

export { expect } from '@playwright/test';
