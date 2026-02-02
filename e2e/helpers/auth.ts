/**
 * Authentication Helper Functions for E2E Tests
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${apiURL}/api/auth/login`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  expect(data.token).toBeDefined();
  expect(data.user).toBeDefined();

  // Set token in localStorage
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
  }, data.token);

  return { token: data.token, user: data.user };
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${apiURL}/api/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
    },
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create test user: ${error.error || 'Unknown error'}`);
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
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.delete(`${apiURL}/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
}
