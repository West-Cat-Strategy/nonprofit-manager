import { test, expect } from '@playwright/test';

test.describe('Portal Messaging + Appointments', () => {
  test('redirects unauthenticated users to portal login for protected portal routes', async ({ page }) => {
    await page.goto('/portal/messages');
    await expect(page).toHaveURL(/\/portal\/login/);

    await page.goto('/portal/appointments');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('renders portal auth entry points', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page.getByRole('heading', { name: /portal/i })).toBeVisible();

    await page.goto('/portal/signup');
    await expect(page.getByRole('heading', { name: /request portal access/i })).toBeVisible();
  });
});
