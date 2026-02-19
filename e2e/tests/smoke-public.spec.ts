import { test, expect } from '@playwright/test';
import '../helpers/testEnv';

test.describe('Public smoke', () => {
  test('loads login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('loads portal login page', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page).toHaveURL(/\/portal\/login/);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });
});
