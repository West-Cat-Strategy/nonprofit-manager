/**
 * Authentication E2E Tests
 * Tests for login, logout, and registration flows
 */

import '../helpers/testEnv';
import { test, expect } from '@playwright/test';
import { login, logout, clearAuth, ensureLoginViaAPI } from '../helpers/auth';
import { getSharedTestUser } from '../helpers/testUser';

const getCreds = () => getSharedTestUser();

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getCreds();
    await ensureLoginViaAPI(page, email, password, {
      firstName: 'Test',
      lastName: 'User',
    });
    await clearAuth(page);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/Login/);

    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling form
    await page.click('button[type="submit"]');

    // HTML5 required attributes should keep inputs invalid.
    await expect(page.locator('input[name="email"]')).toHaveJSProperty('validity.valid', false);
    await expect(page.locator('input[name="password"]')).toHaveJSProperty('validity.valid', false);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

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
    await expect(page).toHaveURL('/dashboard');

    // Check for dashboard shell elements.
    await expect(page.getByRole('heading', { name: /workbench overview|dashboard/i })).toBeVisible({
      timeout: 5000,
    });

    // Check that user data is set in localStorage
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    const { email, password } = getCreds();
    await login(page, email, password);
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await logout(page);

    // Should redirect to login page
    await expect(page).toHaveURL('/login');

    // Check that user data is cleared
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeFalsy();
  });

  test('should redirect to login when accessing protected route without auth', async ({
    page,
  }) => {
    await clearAuth(page);

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    const { email, password } = getCreds();
    await login(page, email, password);
    await expect(page).toHaveURL('/dashboard');

    // Reload page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard');

    // Check that we're still authenticated
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeTruthy();
  });

  test('should show password when toggle is clicked', async ({ page }) => {
    await page.goto('/login');

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
    await page.goto('/login');

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
  test('should handle expired token gracefully', async ({ page }) => {
    await page.goto('/login');
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
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeFalsy();
  });
});
