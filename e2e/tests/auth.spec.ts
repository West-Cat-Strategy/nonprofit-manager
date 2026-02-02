/**
 * Authentication E2E Tests
 * Tests for login, logout, and registration flows
 */

import { test, expect } from '@playwright/test';
import { login, logout, clearAuth } from '../helpers/auth';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123!@#';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
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

    // Check for error messages
    await expect(page.locator('text=/email.*required/i')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=/password.*required/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(
      page.locator('text=/invalid.*credentials|login.*failed/i')
    ).toBeVisible({ timeout: 5000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Check for dashboard elements
    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({
      timeout: 5000,
    });

    // Check that auth token is set
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await logout(page);

    // Should redirect to login page
    await expect(page).toHaveURL('/login');

    // Check that auth token is cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
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
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await expect(page).toHaveURL('/dashboard');

    // Reload page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard');

    // Check that we're still authenticated
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
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
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Set an expired/invalid token
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired-token-12345');
    });

    // Try to access protected route
    await page.goto('/accounts');

    // Should redirect to login or show error
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login/);
  });

  test('should clear session on logout', async ({ page }) => {
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Logout
    await logout(page);

    // Check that localStorage is cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });
});
