/**
 * Accounts Module E2E Tests
 * Tests for account CRUD operations and list management
 */

import { test, expect } from '../fixtures/auth.fixture';
import { createTestAccount, clearDatabase } from '../helpers/database';

test.describe('Accounts Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    // Clear database before each test
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display accounts list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/accounts');

    // Check page title
    await expect(authenticatedPage.locator('h1')).toContainText(/accounts/i);

    // Check for "Create Account" button
    await expect(
      authenticatedPage.locator('button:has-text("New Account"), a:has-text("New Account")')
    ).toBeVisible();

    // Check for search input
    await expect(
      authenticatedPage.locator('input[placeholder*="Search"]')
    ).toBeVisible();
  });

  test('should create a new account via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/accounts');

    // Click "New Account" button
    await authenticatedPage.click('text=/New Account|Create Account/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/accounts\/(new|create)/);

    // Fill form
    await authenticatedPage.fill('input[name="name"]', 'Test Organization');
    await authenticatedPage.selectOption(
      'select[name="accountType"]',
      'organization'
    );
    await authenticatedPage.fill('input[name="email"]', 'test@testorg.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0100');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to account detail page
    await authenticatedPage.waitForURL(/\/accounts\/[a-f0-9-]+$/);

    // Check that account details are displayed
    await expect(
      authenticatedPage.locator('text=Test Organization')
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('text=test@testorg.com')
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
      authenticatedPage.locator('text=/name.*required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should search accounts by name', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test accounts
    await createTestAccount(authenticatedPage, authToken, {
      name: 'Apple Foundation',
      email: 'apple@example.com',
    });
    await createTestAccount(authenticatedPage, authToken, {
      name: 'Banana Charity',
      email: 'banana@example.com',
    });
    await createTestAccount(authenticatedPage, authToken, {
      name: 'Cherry Nonprofit',
      email: 'cherry@example.com',
    });

    await authenticatedPage.goto('/accounts');

    // Wait for accounts to load
    await authenticatedPage.waitForTimeout(1000);

    // Search for "Apple"
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill('Apple');

    // Wait for search results
    await authenticatedPage.waitForTimeout(1000);

    // Should show Apple Foundation
    await expect(
      authenticatedPage.locator('text=Apple Foundation')
    ).toBeVisible();

    // Should not show others
    await expect(
      authenticatedPage.locator('text=Banana Charity')
    ).not.toBeVisible();
  });

  test('should view account details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id } = await createTestAccount(authenticatedPage, authToken, {
      name: 'Detail Test Org',
      email: 'detail@test.com',
      phone: '555-0101',
    });

    // Navigate to account detail page
    await authenticatedPage.goto(`/accounts/${id}`);

    // Check account details are displayed
    await expect(
      authenticatedPage.locator('text=Detail Test Org')
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('text=detail@test.com')
    ).toBeVisible();
    await expect(authenticatedPage.locator('text=555-0101')).toBeVisible();

    // Check for edit button
    await expect(
      authenticatedPage.locator('button:has-text("Edit"), a:has-text("Edit")')
    ).toBeVisible();
  });

  test('should edit account details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id } = await createTestAccount(authenticatedPage, authToken, {
      name: 'Original Name',
      email: 'original@test.com',
    });

    // Navigate to account detail page
    await authenticatedPage.goto(`/accounts/${id}`);

    // Click edit button
    await authenticatedPage.click('text=/Edit/i');

    // Wait for edit form
    await authenticatedPage.waitForURL(/\/accounts\/[a-f0-9-]+\/edit/);

    // Change name
    const nameInput = authenticatedPage.locator('input[name="name"]');
    await nameInput.fill('Updated Name');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect back to detail page
    await authenticatedPage.waitForURL(`/accounts/${id}`);

    // Check updated name is displayed
    await expect(
      authenticatedPage.locator('text=Updated Name')
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('text=Original Name')
    ).not.toBeVisible();
  });

  test('should delete account', async ({ authenticatedPage, authToken }) => {
    // Create test account
    const { id } = await createTestAccount(authenticatedPage, authToken, {
      name: 'Delete Test Org',
      email: 'delete@test.com',
    });

    // Navigate to account detail page
    await authenticatedPage.goto(`/accounts/${id}`);

    // Click delete button
    await authenticatedPage.click('button:has-text("Delete")');

    // Confirm deletion in modal
    await authenticatedPage.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should redirect to accounts list
    await authenticatedPage.waitForURL('/accounts');

    // Navigate to deleted account (should show 404 or redirect)
    await authenticatedPage.goto(`/accounts/${id}`);

    // Should show error or redirect
    await expect(
      authenticatedPage.locator('text=/not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should paginate accounts list', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create 25 test accounts (assuming page size is 20)
    for (let i = 1; i <= 25; i++) {
      await createTestAccount(authenticatedPage, authToken, {
        name: `Account ${i.toString().padStart(2, '0')}`,
        email: `account${i}@test.com`,
      });
    }

    await authenticatedPage.goto('/accounts');

    // Wait for accounts to load
    await authenticatedPage.waitForTimeout(2000);

    // Should see pagination controls
    await expect(
      authenticatedPage.locator('button:has-text("Next"), text=/Next/i')
    ).toBeVisible();

    // Click next page
    await authenticatedPage.click('button:has-text("Next")');

    // Wait for page to load
    await authenticatedPage.waitForTimeout(1000);

    // Should show accounts from page 2
    await expect(
      authenticatedPage.locator('text=/Page 2|2 of/i')
    ).toBeVisible();
  });

  test('should filter accounts by type', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create accounts of different types
    await createTestAccount(authenticatedPage, authToken, {
      name: 'Organization Account',
      accountType: 'organization',
    });
    await createTestAccount(authenticatedPage, authToken, {
      name: 'Individual Account',
      accountType: 'individual',
    });

    await authenticatedPage.goto('/accounts');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by organization type
    const typeFilter = authenticatedPage.locator('select[name="accountType"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('organization');
      await authenticatedPage.waitForTimeout(1000);

      // Should show organization account
      await expect(
        authenticatedPage.locator('text=Organization Account')
      ).toBeVisible();

      // Should not show individual account
      await expect(
        authenticatedPage.locator('text=Individual Account')
      ).not.toBeVisible();
    }
  });
});
