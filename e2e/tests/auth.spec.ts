/**
 * Authentication E2E Tests
 * Tests for login, logout, and registration flows
 */

import '../helpers/testEnv';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { login, logout, clearAuth, ensureLoginViaAPI } from '../helpers/auth';
<<<<<<< HEAD
import { getSharedTestUser, setSharedTestUser } from '../helpers/testUser';
=======
import { getSharedTestUser } from '../helpers/testUser';
>>>>>>> origin/main

const defaultCreds = {
  email: process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com',
  password: process.env.ADMIN_USER_PASSWORD?.trim() || 'Admin123!@#',
};
let currentCreds = { ...defaultCreds };
const getCreds = () => currentCreds;
const dashboardUrl = /\/dashboard(?:[/?#]|$)/;

const gotoLogin = async (page: Page) => {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
    } catch {
      // Redirect chains can occasionally abort the initial navigation request.
    }

    if (!page.url().startsWith('chrome-error://')) {
      try {
        await expect(page).toHaveURL(/\/login/);
        return;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
      }
    }

    await page.waitForTimeout(250);
  }

  await expect(page).toHaveURL(/\/login/);
};

const gotoDashboardWithApiAuth = async (page: Page) => {
  const { email, password } = getCreds();
  await ensureLoginViaAPI(page, email, password, {
    firstName: 'Test',
    lastName: 'User',
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(dashboardUrl);
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    const sharedUser = getSharedTestUser();
    const session = await ensureLoginViaAPI(page, sharedUser.email, sharedUser.password, {
      firstName: 'Test',
      lastName: 'User',
    });
    currentCreds = {
      email: typeof session.user?.email === 'string' ? session.user.email : sharedUser.email,
      password: sharedUser.password,
    };
    await clearAuth(page);
  });

  test('should display login page', async ({ page }) => {
    await gotoLogin(page);

    // Check page title
    await expect(page).toHaveTitle(/Login/);

    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await gotoLogin(page);

    // Click submit without filling form
    await page.click('button[type="submit"]');

    // HTML5 required attributes should keep inputs invalid.
    await expect(page.locator('input[name="email"]')).toHaveJSProperty('validity.valid', false);
    await expect(page.locator('input[name="password"]')).toHaveJSProperty('validity.valid', false);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await gotoLogin(page);

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const { email, password } = getCreds();
    await login(page, email, password);

    // Should redirect to dashboard
    await expect(page).toHaveURL(dashboardUrl);

    // WebKit can render the shell heading slower; accept either a dashboard heading or primary nav link.
    await expect
      .poll(
        async () => {
          const headingVisible = await page
            .getByRole('heading', { name: /workbench overview|dashboard/i })
            .first()
            .isVisible();
          if (headingVisible) {
            return true;
          }
          return page.getByRole('link', { name: /dashboard|accounts/i }).first().isVisible();
        },
        { timeout: 10000 }
      )
      .toBe(true);

    // Check that user data is set in localStorage
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeTruthy();
  });

<<<<<<< HEAD
  test('login helper honors the credentials passed by the caller', async ({ page }) => {
    const tempEmail = `e2e+login-helper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const tempPassword = 'Test123!@#';

    await ensureLoginViaAPI(page, tempEmail, tempPassword, {
      firstName: 'Temp',
      lastName: 'User',
    });
    setSharedTestUser({
      email: tempEmail,
      password: 'WrongPass123!',
    });

    await clearAuth(page);
    await login(page, tempEmail, tempPassword);

    await expect(page).toHaveURL(dashboardUrl);
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toContain(tempEmail);
  });

  test('dashboard startup does not request analytics/task summary endpoints', async ({ page }) => {
    const startupRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (
        /\/api\/(?:v2\/)?analytics\/summary(?:\?|$)/.test(url) ||
        /\/api\/(?:v2\/)?tasks\/summary(?:\?|$)/.test(url)
      ) {
        startupRequests.push(url);
      }
    });

=======
  test('dashboard startup does not request analytics/task summary endpoints', async ({ page }) => {
    const startupRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (
        /\/api\/(?:v2\/)?analytics\/summary(?:\?|$)/.test(url) ||
        /\/api\/(?:v2\/)?tasks\/summary(?:\?|$)/.test(url)
      ) {
        startupRequests.push(url);
      }
    });

>>>>>>> origin/main
    await gotoDashboardWithApiAuth(page);
    await expect
      .poll(
        async () => {
          const headingVisible = await page
            .getByRole('heading', { name: /workbench overview|dashboard/i })
            .first()
            .isVisible();
          if (headingVisible) {
            return true;
          }
          return page.getByRole('link', { name: /dashboard|accounts/i }).first().isVisible();
        },
        { timeout: 10000 }
      )
      .toBe(true);

    await expect(page.getByText(/today at a glance/i).first()).toBeVisible();
    await expect(page.getByText(/pinned shortcuts/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /create intake/i }).first()).toBeVisible();

    await page.waitForTimeout(800);
    expect(startupRequests).toEqual([]);
  });

  test('authenticated route transitions do not repeatedly refetch preferences/branding', async ({ page }) => {
    const preferencesRequests: string[] = [];
    const brandingRequests: string[] = [];
    const clickNavLink = async (link: ReturnType<Page['locator']>): Promise<void> => {
      try {
        await link.click({ timeout: 5000 });
      } catch {
        // Chromium occasionally reports pointer interception on top-nav links; dispatch click directly.
        await link.evaluate((node) => {
          if (node instanceof HTMLElement) {
            node.click();
          }
        });
      }
    };

    const clickVisibleNavLink = async (href: string, fallbackName: RegExp) => {
      const hrefLinks = page.locator(`a[href="${href}"]`);
      const count = await hrefLinks.count();
      for (let i = 0; i < count; i += 1) {
        const link = hrefLinks.nth(i);
        if (await link.isVisible()) {
          await clickNavLink(link);
          return;
        }
      }

      const fallbackLink = page.getByRole('link', { name: fallbackName }).first();
      await expect(fallbackLink).toBeVisible();
      await clickNavLink(fallbackLink);
    };

    page.on('request', (request) => {
      const url = request.url();
      if (/\/api\/(?:v2\/)?auth\/preferences(?:\?|$)/.test(url)) {
        preferencesRequests.push(url);
      }
      if (/\/api\/(?:v2\/)?admin\/branding(?:\?|$)/.test(url)) {
        brandingRequests.push(url);
      }
    });

    const { email, password } = getCreds();
    await login(page, email, password);
    await expect(page).toHaveURL(dashboardUrl);
    await page.waitForTimeout(800);
    expect(preferencesRequests).toEqual([]);
    expect(brandingRequests).toEqual([]);

    await clickVisibleNavLink('/contacts', /people|contacts/i);
    await expect(page).toHaveURL('/contacts');
    await page.waitForTimeout(500);
    await clickVisibleNavLink('/dashboard', /dashboard|home/i);
    await expect(page).toHaveURL(dashboardUrl);

    await page.waitForTimeout(800);
    expect(preferencesRequests).toEqual([]);
    expect(brandingRequests).toEqual([]);
  });

  test('quick lookup uses lookup endpoint instead of full contacts list search', async ({ page }) => {
    const lookupRequests: string[] = [];
    const legacySearchRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (/\/api\/(?:v2\/)?contacts\/lookup(?:\?|$)/.test(url)) {
        lookupRequests.push(url);
      }
      if (/\/api\/(?:v2\/)?contacts\?/.test(url) && url.includes('search=')) {
        legacySearchRequests.push(url);
      }
    });

    await gotoDashboardWithApiAuth(page);

    await page.getByRole('button', { name: /search/i }).first().click();
    const searchInput = page.getByPlaceholder('Search by name, email, or phone...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('zz');
    await page.waitForTimeout(800);

    expect(lookupRequests.length).toBeGreaterThan(0);
    expect(legacySearchRequests).toEqual([]);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    const { email, password } = getCreds();
    await login(page, email, password);
    await expect(page).toHaveURL(dashboardUrl);

    // Logout
    await logout(page);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login(?:\?|$)/);

    // Check that user data is cleared
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('user')))
      .toBeFalsy();
  });

  test('should redirect to login when accessing protected route without auth', async ({
    page,
  }) => {
    await clearAuth(page);
    await gotoLogin(page);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Try to access protected route
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    } catch {
      // Redirect chains can occasionally abort the initial navigation request.
    }

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    const { email, password } = getCreds();
    await login(page, email, password);
    await expect(page).toHaveURL(dashboardUrl);

    // Reload page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL(dashboardUrl);

    // Check that we're still authenticated
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeTruthy();
  });

  test('should show password when toggle is clicked', async ({ page }) => {
    await gotoLogin(page);

    const passwordInput = page.locator('input[name="password"]');

    // Initially should be password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password toggle if it exists
    const toggleButton = page.locator('[data-testid="toggle-password"]');
    if (await toggleButton.isVisible()) {
      await toggleButton.click();

      // Should change to text type
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should remember email if "Remember me" is checked', async ({ page }) => {
    await gotoLogin(page);

    const email = 'remember@example.com';
    await page.fill('input[name="email"]', email);

    // Check "Remember me" if it exists
    const rememberCheckbox = page.locator('input[type="checkbox"][name="remember"]');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();

      // Submit form (will fail with invalid credentials, but that's ok)
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');

      // Reload page
      await page.reload();

      // Email should be remembered
      const emailValue = await page.locator('input[name="email"]').inputValue();
      expect(emailValue).toBe(email);
    }
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    const sharedUser = getSharedTestUser();
    const session = await ensureLoginViaAPI(page, sharedUser.email, sharedUser.password, {
      firstName: 'Test',
      lastName: 'User',
    });
    currentCreds = {
      email: typeof session.user?.email === 'string' ? session.user.email : sharedUser.email,
      password: sharedUser.password,
    };
    await clearAuth(page);
  });

  test('should handle expired token gracefully', async ({ page }) => {
    await gotoLogin(page);
    const { email, password } = getCreds();
    await login(page, email, password);

    // Simulate expired local state and expired session cookie.
    await page.evaluate(() => {
      localStorage.setItem('user', 'expired-user-data');
    });
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/accounts');

    // Should redirect to login once auth is invalid.
    await expect(page).toHaveURL(/\/login/);
  });

  test('should clear session on logout', async ({ page }) => {
    const { email, password } = getCreds();
    await login(page, email, password);

    // Logout
    await logout(page);

    // Check that localStorage is cleared
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('user')))
      .toBeFalsy();
  });
});
