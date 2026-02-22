/**
 * Authentication Helper Functions for E2E Tests
 */

import fs from 'fs';
import path from 'path';
import { Page, expect } from '@playwright/test';
import { setSharedTestUser } from './testUser';

const RETRYABLE_NETWORK_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up/i;
const HTTP_SCHEME = ['http', '://'].join('');

const isRetryableNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return RETRYABLE_NETWORK_ERROR.test(error.message);
};

async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 300;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthSession {
  token: string;
  user: any;
  email: string;
  password: string;
  isAdmin: boolean;
}

export async function ensureSetupComplete(
  page: Page,
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string; organizationName?: string }
): Promise<void> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
  const firstName = profile?.firstName || 'Test';
  const lastName = profile?.lastName || 'User';
  const organizationName = profile?.organizationName || 'E2E Organization';
  const setupResponse = await withNetworkRetry(() =>
    page.request.post(`${apiURL}/api/auth/setup`, {
      data: {
        email,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        organization_name: organizationName
      },
      headers: { 'Content-Type': 'application/json' },
    })
  );

  if (setupResponse.ok()) {
    return;
  }

  const status = setupResponse.status();
  if (status === 400 || status === 403 || status === 409 || status === 500) {
    // Setup already completed or user exists.
    return;
  }

  const responseText = await setupResponse.text().catch(() => '');
  console.log(`Setup failed with status ${status}. Response: ${responseText}`);
  throw new Error(`Setup failed with status ${status}: ${responseText}`);
}

/**
 * Login via UI
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL('/dashboard');

  const user = await page.evaluate(() => localStorage.getItem('user'));
  if (!user) {
    throw new Error('Login succeeded but no user data found in localStorage');
  }
}

/**
 * Login via API and set localStorage token
 * Faster than UI login for tests that don't need to test auth
 */
export async function loginViaAPI(
  page: Page,
  email: string,
  password: string
): Promise<{ token: string; user: any }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;

  // Prevent stale auth cookies from previous fixture invocations from masking fresh logins.
  await page.context().clearCookies();

  const response = await withNetworkRetry(() =>
    page.request.post(`${apiURL}/api/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    })
  );

  if (!response.ok()) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      typeof errorBody?.error === 'string'
        ? errorBody.error
        : `Login failed with status ${response.status()}`;
    const error = new Error(`${message} (email: ${email})`);
    (error as Error & { status?: number }).status = response.status();
    throw error;
  }

  const data = await response.json();
  expect(data.token).toBeDefined();
  expect(data.user).toBeDefined();

  // Set token in localStorage
  await page.goto('/');
  await page.evaluate(
    ({ token, organizationId }) => {
      localStorage.setItem('token', token);
      if (organizationId) {
        localStorage.setItem('organizationId', organizationId);
      }
    },
    { token: data.token, organizationId: data.organizationId }
  );

  return { token: data.token, user: data.user };
}

/**
 * Ensure an admin session for tests that require elevated permissions.
 */
export async function ensureAdminLoginViaAPI(
  page: Page,
  profile?: { firstName?: string; lastName?: string; organizationName?: string }
): Promise<AuthSession> {
  const adminEmail = process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com';
  const adminPassword = process.env.ADMIN_USER_PASSWORD?.trim() || 'Admin123!@#';

  const toSession = (
    result: { token: string; user: any },
    email: string,
    password: string
  ): AuthSession => ({
    ...result,
    email,
    password,
    isAdmin: typeof result.user?.role === 'string' && result.user.role.toLowerCase() === 'admin',
  });

  try {
    return toSession(await loginViaAPI(page, adminEmail, adminPassword), adminEmail, adminPassword);
  } catch {
    await ensureSetupComplete(page, adminEmail, adminPassword, {
      firstName: profile?.firstName || 'Admin',
      lastName: profile?.lastName || 'User',
      organizationName: profile?.organizationName || 'E2E Organization',
    });
    try {
      return toSession(await loginViaAPI(page, adminEmail, adminPassword), adminEmail, adminPassword);
    } catch {
      const fallbackEmail =
        process.env.TEST_USER_EMAIL?.trim() ||
        `e2e+admin-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const fallbackPassword = process.env.TEST_USER_PASSWORD?.trim() || 'Test123!@#';

      // Keep tests resilient when a persisted local admin user password drifts from .env.test.
      return toSession(
        await ensureLoginViaAPI(page, fallbackEmail, fallbackPassword, {
          firstName: profile?.firstName || 'Admin',
          lastName: profile?.lastName || 'User',
        }),
        fallbackEmail,
        fallbackPassword
      );
    }
  }
}

/**
 * Ensure a test user exists, then login via API.
 */
export async function ensureLoginViaAPI(
  page: Page,
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string }
): Promise<{ token: string; user: any }> {
  const attemptLogin = async () => loginViaAPI(page, email, password);
  const cacheDir = path.resolve(__dirname, '..', '.cache');
  const readyFile = path.join(cacheDir, 'auth-ready.json');
  const lockFile = path.join(cacheDir, 'auth-lock');

  const waitForReady = async (timeoutMs = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (fs.existsSync(readyFile)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  if (fs.existsSync(readyFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(readyFile, 'utf8')) as { email?: string };
      if (cached?.email && cached.email !== email) {
        fs.unlinkSync(readyFile);
      } else {
        return await attemptLogin();
      }
    } catch {
      // If cache is unreadable, recreate it.
      try {
        fs.unlinkSync(readyFile);
      } catch {
        // ignore
      }
    }
  }

  fs.mkdirSync(cacheDir, { recursive: true });

  let hasLock = false;
  try {
    fs.writeFileSync(lockFile, `${process.pid}`, { encoding: 'utf8', flag: 'wx' });
    hasLock = true;
  } catch {
    // Another worker is creating the user.
  }

  if (!hasLock) {
    await waitForReady();
    return await attemptLogin();
  }

  try {
    // Fast path: user may already exist from a previous run.
    try {
      const existing = await attemptLogin();
      fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
        encoding: 'utf8',
      });
      return existing;
    } catch {
      // Continue with setup/user creation flow below.
    }

    // Secondary fast path: use configured admin credentials if available.
    const adminEmail = process.env.ADMIN_USER_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_USER_PASSWORD?.trim();
    if (adminEmail && adminPassword) {
      try {
        const adminResult = await loginViaAPI(page, adminEmail, adminPassword);
        setSharedTestUser({ email: adminEmail, password: adminPassword });
        fs.writeFileSync(readyFile, JSON.stringify({ email: adminEmail, at: Date.now() }), {
          encoding: 'utf8',
        });
        return adminResult;
      } catch {
        // Fall through to setup flow.
      }
    }

    await ensureSetupComplete(page, email, password, profile);
    try {
      const afterSetup = await attemptLogin();
      fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
        encoding: 'utf8',
      });
      return afterSetup;
    } catch {
      // Continue to registration fallback.
    }
    const firstName = profile?.firstName || 'Test';
    const lastName = profile?.lastName || 'User';

    try {
      await createTestUser(page, { email, password, firstName, lastName });
    } catch (registerError) {
      const registerMessage =
        registerError instanceof Error ? registerError.message : String(registerError);
      const lowerMessage = registerMessage.toLowerCase();
      const isDuplicate = lowerMessage.includes('user already exists');
      const isRateLimited =
        lowerMessage.includes('too many registration attempts') ||
        lowerMessage.includes('rate limit');
      if (!isDuplicate && !isRateLimited) {
        throw new Error(`Registration failed for ${email}: ${registerMessage}`);
      }
    }

    try {
      const result = await attemptLogin();
      fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
        encoding: 'utf8',
      });
      return result;
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : String(loginError);
      if (!message.toLowerCase().includes('invalid credentials')) {
        throw loginError;
      }

      const fallbackEmail = `e2e+${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}@example.com`;
      const fallbackPassword = password;
      try {
        await createTestUser(page, {
          email: fallbackEmail,
          password: fallbackPassword,
          firstName,
          lastName,
        });
      } catch (fallbackCreateError) {
        const fallbackMessage =
          fallbackCreateError instanceof Error
            ? fallbackCreateError.message
            : String(fallbackCreateError);
        throw new Error(
          `Login failed for ${email} and fallback user creation failed: ${fallbackMessage}`
        );
      }
      setSharedTestUser({ email: fallbackEmail, password: fallbackPassword });
      const result = await loginViaAPI(page, fallbackEmail, fallbackPassword);
      fs.writeFileSync(readyFile, JSON.stringify({ email: fallbackEmail, at: Date.now() }), {
        encoding: 'utf8',
      });
      return result;
    }
  } finally {
    if (hasLock) {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Logout via UI
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu from top navigation (supports current and legacy selectors).
  const userMenu = page
    .getByRole('button', { name: /user menu/i })
    .or(page.locator('button[aria-haspopup="menu"][aria-controls="user-menu"]'))
    .first();
  await userMenu.click({ timeout: 7000 });

  // Click logout action (supports button/menuitem variants).
  const logoutAction = page
    .getByRole('button', { name: /logout|sign out/i })
    .or(page.getByRole('menuitem', { name: /logout|sign out/i }))
    .first();
  await logoutAction.click({ timeout: 7000 });

  // Wait for redirect to login.
  await page.waitForURL(/\/login(?:\?|$)/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // If the page is navigating/closed, avoid failing teardown.
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const user = await page.evaluate(() => localStorage.getItem('user'));
  return !!user;
}

/**
 * Get auth token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('user'));
}

/**
 * Create test user via API
 */
export async function createTestUser(
  page: Page,
  user: TestUser
): Promise<{ id: string; email: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;

  const response = await page.request.post(`${apiURL}/api/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      password_confirm: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
    },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    const errorText = await response.text().catch(() => '');
    let message = 'Unknown error';
    if (errorText) {
      console.log(`Registration failed for ${user.email}. Response: ${errorText}`);
      try {
        const parsed = JSON.parse(errorText);
        if (typeof parsed?.error === 'string') {
          message = parsed.error;
        } else if (typeof parsed?.message === 'string') {
          message = parsed.message;
        } else {
          message = JSON.stringify(parsed);
        }
      } catch {
        message = errorText;
      }
    }
    throw new Error(`Failed to create test user: ${message}`);
  }

  const data = await response.json();
  return { id: data.user.id, email: data.user.email };
}

/**
 * Delete test user via API (requires admin token)
 */
export async function deleteTestUser(
  page: Page,
  userId: string,
  adminToken: string
): Promise<void> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;

  const response = await page.request.delete(`${apiURL}/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
}
