/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import '../helpers/testEnv';
import { test as base, Page } from '@playwright/test';
import {
  ensureEffectiveAdminLoginViaAPI,
  clearAuth,
  applyAuthTokenState,
  invalidateSharedAuthCaches,
  invalidateIncompatibleAdminAuthBootstrapCaches,
} from '../helpers/auth';
import { clearDatabase } from '../helpers/database';

// Extend base test with custom fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  authToken: string;
};

type CachedAuthState = {
  token: string;
  organizationId?: string;
  user?: Record<string, unknown>;
};

let cachedAuthState: CachedAuthState | null = null;

const APP_LOADING_LABEL = '[aria-label="Loading application"]';

const waitForAuthenticatedShellReady = async (page: Page): Promise<void> => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator(APP_LOADING_LABEL).waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await page
    .waitForURL(
      (url) => !url.pathname.startsWith('/login') && !url.pathname.startsWith('/setup'),
      { timeout: 15_000 }
    )
    .catch(() => undefined);
};

const normalizeOrganizationId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeAuthUser = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const resolveCachedAuthOrganizationId = (
  context: string,
  input: { organizationId?: unknown; user?: Record<string, unknown> }
): string => {
  const organizationId =
    normalizeOrganizationId(input.organizationId) ||
    normalizeOrganizationId(input.user?.organizationId) ||
    normalizeOrganizationId(input.user?.organization_id);

  if (!organizationId) {
    throw new Error(`${context} is missing a validated organization id`);
  }

  return organizationId;
};

const resetCachedAuthState = async (
  page: Page,
  options: { clearAdminCaches?: boolean } = {}
): Promise<void> => {
  cachedAuthState = null;
  invalidateSharedAuthCaches({ clearLocks: true, clearAdminCaches: options.clearAdminCaches });
  await clearAuth(page);
};

const ensureSharedAuthState = async (page: Page): Promise<CachedAuthState> => {
  const invalidatedStaleAdminAuth = await invalidateIncompatibleAdminAuthBootstrapCaches(page);
  if (invalidatedStaleAdminAuth) {
    cachedAuthState = null;
    await clearAuth(page);
  }

  if (cachedAuthState?.token) {
    try {
      const restoredSession = await applyAuthTokenState(
        page,
        cachedAuthState.token,
        cachedAuthState.organizationId,
        cachedAuthState.user
      );

      if (restoredSession) {
        const restoredOrganizationId = resolveCachedAuthOrganizationId('Shared auth restore', {
          organizationId: restoredSession.organizationId,
          user: normalizeAuthUser(restoredSession.user),
        });
        cachedAuthState = {
          ...cachedAuthState,
          organizationId: restoredOrganizationId,
          user: normalizeAuthUser(restoredSession.user),
        };
        return cachedAuthState;
      }
    } catch {
      // Fall through to a full re-bootstrap after clearing the stale cache below.
    }

    await resetCachedAuthState(page, { clearAdminCaches: true });
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const session = await ensureEffectiveAdminLoginViaAPI(page, {
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'E2E Organization',
      });
      const sessionRecord = session as { organizationId?: unknown; user?: Record<string, unknown> };
      const organizationId = resolveCachedAuthOrganizationId('Shared auth bootstrap', {
        organizationId: sessionRecord.organizationId,
        user: normalizeAuthUser(session.user),
      });
      cachedAuthState = {
        token: session.token,
        organizationId,
        user: normalizeAuthUser(session.user),
      };
      return cachedAuthState;
    } catch (error) {
      lastError = error;
      await resetCachedAuthState(page, { clearAdminCaches: true });
      if (attempt === 2) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to establish shared authenticated E2E state');
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
    await waitForAuthenticatedShellReady(page);

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
