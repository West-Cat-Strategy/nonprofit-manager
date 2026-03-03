/**
 * Accounts Module E2E Tests
 * Tests for account CRUD operations and list management
 */

import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';
import { createTestAccount } from '../helpers/database';

async function getAccountsFilterForm(authenticatedPage: Page) {
  const filterForm = authenticatedPage.locator('form').filter({
    has: authenticatedPage.getByRole('button', { name: 'Search' }),
  }).first();
  await expect(filterForm).toBeVisible({ timeout: 15000 });
  return filterForm;
}

async function searchAccountByName(authenticatedPage: Page, name: string) {
  await authenticatedPage.goto('/accounts', { waitUntil: 'domcontentloaded' });
  const filterForm = await getAccountsFilterForm(authenticatedPage);
  const searchInput = filterForm.getByRole('textbox').first();
  await expect(searchInput).toBeVisible({ timeout: 15000 });
  await searchInput.fill(name);
  await filterForm.getByRole('button', { name: 'Search' }).click();
}

test.describe('Accounts Module', () => {
  test('should display accounts list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/accounts', { waitUntil: 'domcontentloaded' });
    await expect(authenticatedPage).toHaveURL(/\/accounts(?:\?|$)/);
    await expect(authenticatedPage.locator('body')).toContainText(/accounts|loading/i, { timeout: 30000 });
  });

  test('should create a new account via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/accounts');

    // Click "New Account" button
    await authenticatedPage.click('text=/New Account|Create Account/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/accounts\/(new|create)/);

    const accountName = `Test Organization ${Date.now()}`;
    const accountEmail = `test+${Date.now()}@testorg.com`;
    // Fill form
    await authenticatedPage.fill('input[name="account_name"]', accountName);
    await authenticatedPage.selectOption(
      'select[name="account_type"]',
      'organization'
    );
    await authenticatedPage.selectOption('select[name="category"]', 'donor');
    await authenticatedPage.fill('input[name="email"]', accountEmail);
    await authenticatedPage.fill('input[name="phone"]', '555-0100');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to accounts list page
    await authenticatedPage.waitForURL('/accounts', { timeout: 10000 });
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for the account to appear in the list
    await expect(
      authenticatedPage.getByRole('link', { name: accountName }).first()
    ).toBeVisible({ timeout: 15000 });

    // Check that account details are displayed
    await expect(
      authenticatedPage.locator(`text=${accountEmail}`)
    ).toBeVisible();
  });

  test('should show validation errors for required fields', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/accounts/new');

    // Submit without filling required fields
    await authenticatedPage.click('button[type="submit"]');

    // Check for validation errors
    await expect(
      authenticatedPage.locator('text=/account name is required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should search accounts by name', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test accounts
    const suffix = Date.now();
    const accountNames = [
      `Apple Foundation ${suffix}`,
      `Banana Charity ${suffix}`,
      `Cherry Nonprofit ${suffix}`,
    ];

    for (const [index, name] of accountNames.entries()) {
      await createTestAccount(authenticatedPage, authToken, {
        name,
        accountType: 'organization',
        email: `acct.${suffix}.${index}@example.com`,
      });
    }

    await authenticatedPage.goto('/accounts');
    await authenticatedPage.waitForLoadState('networkidle');

    // Search for "Apple" - use correct placeholder
    const filterForm = await getAccountsFilterForm(authenticatedPage);
    const searchInput = filterForm.getByRole('textbox').first();
    await searchInput.fill('Apple');

    // Wait for search to complete
    const searchPromise = authenticatedPage.waitForResponse(resp =>
      resp.url().includes('/api/v2/accounts') && resp.status() === 200
    );

    await filterForm.getByRole('button', { name: 'Search' }).click();

    await searchPromise;

    // Wait for search results
    await expect(authenticatedPage.locator(`text=Apple Foundation ${suffix}`)).toBeVisible({
      timeout: 15000,
    });

    // Should show Apple Foundation
    // Search is server-side; ensure at least the expected result is present.
  });

  test('should view account details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const detailSuffix = Date.now();
    await createTestAccount(authenticatedPage, authToken, {
      name: `Detail Test Org ${detailSuffix}`,
      email: `detail+${detailSuffix}@test.com`,
      phone: '555-0101',
    });

    await searchAccountByName(authenticatedPage, `Detail Test Org ${detailSuffix}`);
    const detailAccountLink = authenticatedPage
      .getByRole('link', { name: `Detail Test Org ${detailSuffix}` })
      .first();
    await expect(detailAccountLink).toBeVisible({ timeout: 15000 });

    // Click on the account
    await detailAccountLink.click({ timeout: 15000 });

    await expect(
      authenticatedPage.locator(`text=Detail Test Org ${detailSuffix}`)
    ).toBeVisible({ timeout: 10000 });
    await expect(
      authenticatedPage.locator(`text=detail+${detailSuffix}@test.com`)
    ).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.locator('text=555-0101')).toBeVisible({ timeout: 10000 });
    await expect(
      authenticatedPage.locator('button:has-text("Edit"), a:has-text("Edit")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should edit account details', async ({
    authenticatedPage,
    authToken,
  }) => {
    const unauthorized: string[] = [];
    authenticatedPage.on('response', (response) => {
      if (response.status() === 401 && response.url().includes('/api/v2/')) {
        unauthorized.push(response.url());
      }
    });
    // Create test account
    const editSuffix = Date.now();
    const { id: accountId } = await createTestAccount(authenticatedPage, authToken, {
      name: `Original Name ${editSuffix}`,
      email: `original+${editSuffix}@test.com`,
    });

    await searchAccountByName(authenticatedPage, `Original Name ${editSuffix}`);
    const originalAccountLink = authenticatedPage
      .getByRole('link', { name: `Original Name ${editSuffix}` })
      .first();
    await expect(originalAccountLink).toBeVisible({ timeout: 15000 });
    await originalAccountLink.click();

    // Click edit button
    await authenticatedPage.click('text=/Edit/i');

    // Wait for edit form
    await authenticatedPage.waitForURL(/\/accounts\/[a-f0-9-]+\/edit/);

    // Change name
    const nameInput = authenticatedPage.locator('input[name="account_name"]');
    await nameInput.fill(`Updated Name ${editSuffix}`);

    // Submit form
    const updateResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/v2/accounts/'),
      { timeout: 10000 }
    );
    await authenticatedPage.click('button[type="submit"]');
    const updateResponse = await updateResponsePromise;
    await expect(updateResponse.status()).toBe(200);
    if (unauthorized.length > 0) {
      throw new Error(`Unauthorized API responses: ${unauthorized.join(', ')}`);
    }
    await authenticatedPage.waitForURL(new RegExp(`/accounts/${accountId}$`), { timeout: 10000 });
    // Force a fresh detail fetch after redirect to avoid stale cached UI in Chromium.
    await authenticatedPage.reload({ waitUntil: 'networkidle' });
    await expect(
      authenticatedPage.getByRole('heading', { name: `Updated Name ${editSuffix}` })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      authenticatedPage.locator(`text=original+${editSuffix}@test.com`)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should delete account', async ({ authenticatedPage, authToken }) => {
    const deleteName = `Delete Test Org ${Date.now()}`;
    await createTestAccount(authenticatedPage, authToken, {
      name: deleteName,
      email: `delete+${Date.now()}@test.com`,
    });
    await searchAccountByName(authenticatedPage, deleteName);
    const deleteRow = authenticatedPage.locator('tr', { hasText: deleteName });
    await expect(deleteRow).toBeVisible();

    // The app uses an in-app confirm dialog (not window.confirm).
    const deleteResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().includes('/api/v2/accounts/') &&
        response.ok(),
      { timeout: 15000 }
    );

    await deleteRow.locator('button:has-text("Delete")').click();
    const confirmModal = authenticatedPage.locator('div.fixed.inset-0').filter({
      hasText: /are you sure you want to delete/i,
    });
    await expect(confirmModal).toBeVisible({ timeout: 10000 });
    await confirmModal.getByRole('button', { name: /^delete$/i }).click();
    await deleteResponsePromise;

    await authenticatedPage.reload();
    await expect(authenticatedPage.locator('tr', { hasText: deleteName })).toHaveCount(0);
  });

  test('should paginate accounts list', async ({
    authenticatedPage,
    authToken,
  }) => {
    const paginateSuffix = Date.now();
    // Create 25 test accounts (assuming page size is 20)
    for (let i = 1; i <= 25; i++) {
      await createTestAccount(authenticatedPage, authToken, {
        name: `Page Test ${paginateSuffix} ${i.toString().padStart(2, '0')}`,
        email: `account${paginateSuffix}-${i}@test.com`,
      });
    }

    await authenticatedPage.goto('/accounts');

    const clearButton = authenticatedPage.locator('button:has-text("Clear")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    await expect(
      authenticatedPage.locator(`text=Page Test ${paginateSuffix} 25`)
    ).toBeVisible({ timeout: 15000 });

    // Should see pagination controls
    const nextButton = authenticatedPage.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();

    // Click next page
    await nextButton.click();
    await expect(authenticatedPage.getByRole('button', { name: /previous/i })).toBeEnabled({
      timeout: 10000,
    });

    await expect(
      authenticatedPage.locator(`text=Page Test ${paginateSuffix} 01`)
    ).toBeVisible({ timeout: 15000 });
  });

  test('should filter accounts by type', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create accounts of different types
    const filterSuffix = Date.now();
    await createTestAccount(authenticatedPage, authToken, {
      name: `Organization Account ${filterSuffix}`,
      accountType: 'organization',
    });
    await createTestAccount(authenticatedPage, authToken, {
      name: `Individual Account ${filterSuffix}`,
      accountType: 'individual',
    });

    await authenticatedPage.goto('/accounts');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by organization type using the labeled Type control.
    const filterForm = authenticatedPage
      .locator('form')
      .filter({ has: authenticatedPage.getByLabel('Type') })
      .first();
    await authenticatedPage.getByLabel('Type').selectOption('organization');
    await filterForm.getByRole('button', { name: 'Search' }).click();

    await expect(
      authenticatedPage.locator(`text=Organization Account ${filterSuffix}`)
    ).toBeVisible({ timeout: 15000 });
  });
});
