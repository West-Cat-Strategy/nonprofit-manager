import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getAlertCard = (page: Page, alertName: string) =>
  page
    .getByRole('heading', { name: alertName, exact: true })
    .locator('xpath=ancestor::div[.//button[@title="Edit alert rule"]][1]');

test.describe('Alerts Workflows', () => {
  test('should create, edit, toggle, and delete an alert configuration through the UI', async ({
    authenticatedPage,
  }) => {
    const suffix = uniqueSuffix();
    const alertName = `UI Alert ${suffix}`;
    const updatedDescription = `Updated description ${suffix}`;

    await authenticatedPage.goto('/alerts');
    await authenticatedPage.getByRole('button', { name: /create alert rule/i }).click();

    await authenticatedPage.getByLabel(/alert rule name/i).fill(alertName);
    await authenticatedPage
      .getByLabel(/description/i)
      .fill(`Initial description ${suffix}`);
    await authenticatedPage.getByLabel(/threshold/i).fill('25');

    const testAlertResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/v2/alerts/test') &&
        response.ok()
    );
    await authenticatedPage.getByRole('button', { name: /test alert rule/i }).click();
    await testAlertResponse;
    await expect(authenticatedPage.getByText(/alert would/i)).toBeVisible();

    const createAlertResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/v2/alerts/configs') &&
        response.ok()
    );
    await authenticatedPage.getByRole('button', { name: /^create alert rule$/i }).last().click();
    await createAlertResponse;

    const alertCard = getAlertCard(authenticatedPage, alertName);
    await expect(alertCard).toBeVisible({ timeout: 15000 });

    const updateAlertResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/api/v2/alerts/configs/') &&
        response.ok()
    );
    await alertCard.locator('[title="Edit alert rule"]').click();
    await authenticatedPage.getByLabel(/description/i).fill(updatedDescription);
    await authenticatedPage.getByLabel(/threshold/i).fill('40');
    await authenticatedPage.getByRole('button', { name: /update alert rule/i }).click();
    await updateAlertResponse;

    await expect(alertCard).toContainText(updatedDescription);

    const pauseAlertResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/api/v2/alerts/configs/') &&
        response.url().endsWith('/toggle') &&
        response.ok()
    );
    await alertCard.locator('[title="Pause alert rule"]').click();
    await pauseAlertResponse;
    await expect(alertCard).toContainText(/paused/i);

    const enableAlertResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/api/v2/alerts/configs/') &&
        response.url().endsWith('/toggle') &&
        response.ok()
    );
    await alertCard.locator('[title="Turn on alert rule"]').click();
    await enableAlertResponse;
    await expect(alertCard).toContainText(/active/i);

    const deleteAlertResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().includes('/api/v2/alerts/configs/') &&
        response.ok()
    );
    await alertCard.locator('[title="Delete alert rule"]').click();
    const confirmDeleteDialog = authenticatedPage
      .locator('.fixed.inset-0')
      .filter({ hasText: /delete alert rule|delete alert configuration/i });
    await expect(confirmDeleteDialog).toBeVisible({ timeout: 10000 });
    await confirmDeleteDialog.getByRole('button', { name: /^delete$/i }).click();
    await deleteAlertResponse;

    await expect(getAlertCard(authenticatedPage, alertName)).toHaveCount(0);
  });
});
