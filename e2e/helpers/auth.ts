/**
 * Authentication Helper Functions for E2E Tests
 */

import fs from 'fs';
import path from 'path';
import { Page, expect } from '@playwright/test';
import { setSharedTestUser } from './testUser';

const AUTH_COOKIE_NAME = 'auth_token';

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function ensureSetupComplete(
  page: Page,
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string }
): Promise<void> {
  const apiURL = process.env.API_URL || 'http://localhost:3001';
  const firstName = profile?.firstName || 'Test';
  const lastName = profile?.lastName || 'User';
  const setupResponse = await page.request.post(`${apiURL}/api/auth/setup`, {
    data: { email, password, firstName, lastName },
    headers: { 'Content-Type': 'application/json' },
  });

  if (setupResponse.ok()) {
    return;
  }

  const status = setupResponse.status();
  if (status === 403 || status === 409) {
    // Setup already completed or user exists.
    return;
  }

  const responseText = await setupResponse.text().catch(() => '');
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

  const token = await page.evaluate(() => localStorage.getItem('token'));
  if (!token) {
    throw new Error('Login succeeded but no auth token stored in localStorage');
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const response = await page.request.post(`${apiURL}/api/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

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

  // Ensure auth cookie is set for API requests (frontend uses httpOnly cookies)
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: data.token,
      domain: 'localhost',
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure: false,
    },
  ]);

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
    await ensureSetupComplete(page, email, password, profile);
    const firstName = profile?.firstName || 'Test';
    const lastName = profile?.lastName || 'User';

    try {
      await createTestUser(page, { email, password, firstName, lastName });
    } catch (registerError) {
      const registerMessage =
        registerError instanceof Error ? registerError.message : String(registerError);
      const lowerMessage = registerMessage.toLowerCase();
      if (!lowerMessage.includes('user already exists')) {
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
      await createTestUser(page, {
        email: fallbackEmail,
        password: fallbackPassword,
        firstName,
        lastName,
      });
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
  // Click user menu
  await page.click('[data-testid="user-menu"]', { timeout: 5000 });

  // Click logout button
  await page.click('[data-testid="logout-button"]', { timeout: 5000 });

  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 10000 });
  await expect(page).toHaveURL('/login');
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return !!token;
}

/**
 * Get auth token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('token'));
}

/**
 * Create test user via API
 */
export async function createTestUser(
  page: Page,
  user: TestUser
): Promise<{ id: string; email: string }> {
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const response = await page.request.post(`${apiURL}/api/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    const errorText = await response.text().catch(() => '');
    let message = 'Unknown error';
    if (errorText) {
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
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  const response = await page.request.delete(`${apiURL}/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
}
