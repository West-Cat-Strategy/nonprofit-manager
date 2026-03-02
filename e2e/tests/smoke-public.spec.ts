import { test, expect } from '@playwright/test';
import '../helpers/testEnv';

test.describe('Public smoke', () => {
  const waitForAppRoute = async (page: import('@playwright/test').Page) => {
    const loadingText = page.getByText('Loading...');
    if (await loadingText.isVisible().catch(() => false)) {
      await loadingText.waitFor({ state: 'detached', timeout: 30_000 });
    }
  };

  test('loads login page', async ({ page }) => {
    await page.goto('/login');
    await waitForAppRoute(page);
    if (page.url().includes('/setup')) {
      await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('input[name="organizationName"]')).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 15_000 });
  });

  test('loads portal login page', async ({ page }) => {
    await page.goto('/portal/login');
    await waitForAppRoute(page);
    if (page.url().includes('/setup')) {
      await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('input[name="organizationName"]')).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(page).toHaveURL(/\/portal\/login/);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 30_000 });
  });
});
