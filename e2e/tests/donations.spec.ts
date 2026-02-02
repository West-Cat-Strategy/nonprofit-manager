/**
 * Donations Module E2E Tests
 * Tests for donation CRUD, payment processing, and receipt management
 */

import { test, expect } from '../fixtures/auth.fixture';
import {
  createTestAccount,
  createTestDonation,
  clearDatabase,
} from '../helpers/database';

test.describe('Donations Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    // Clear database before each test
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display donations list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/donations');

    // Check page title
    await expect(authenticatedPage.locator('h1')).toContainText(/donations/i);

    // Check for "Create Donation" button
    await expect(
      authenticatedPage.locator('button:has-text("New Donation"), a:has-text("New Donation")')
    ).toBeVisible();

    // Check for search input
    await expect(
      authenticatedPage.locator('input[placeholder*="Search"]')
    ).toBeVisible();
  });

  test('should create a new donation via UI', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account first
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Test Donor',
        email: 'donor@example.com',
      }
    );

    await authenticatedPage.goto('/donations');

    // Click "New Donation" button
    await authenticatedPage.click('text=/New Donation|Create Donation/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/donations\/(new|create)/);

    // Fill form
    const accountSelect = authenticatedPage.locator('select[name="accountId"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption(accountId);
    }

    await authenticatedPage.fill('input[name="amount"]', '500.00');

    const dateInput = authenticatedPage.locator('input[name="donationDate"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill(new Date().toISOString().split('T')[0]);
    }

    await authenticatedPage.selectOption('select[name="paymentMethod"]', 'credit_card');
    await authenticatedPage.selectOption('select[name="paymentStatus"]', 'completed');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to donation detail page
    await authenticatedPage.waitForURL(/\/donations\/[a-f0-9-]+$/);

    // Check that donation details are displayed
    await expect(authenticatedPage.locator('text=/\\$500\\.00|500\\.00/')).toBeVisible();
    await expect(authenticatedPage.locator('text=Test Donor')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/donations/new');

    // Submit without filling required fields
    await authenticatedPage.click('button[type="submit"]');

    // Check for validation errors
    await expect(
      authenticatedPage.locator('text=/amount.*required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view donation details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account and donation
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Generous Donor',
        email: 'generous@example.com',
      }
    );

    const { id: donationId } = await createTestDonation(
      authenticatedPage,
      authToken,
      {
        accountId,
        amount: 1000.0,
        paymentMethod: 'credit_card',
        paymentStatus: 'completed',
      }
    );

    // Navigate to donation detail page
    await authenticatedPage.goto(`/donations/${donationId}`);

    // Check donation details are displayed
    await expect(
      authenticatedPage.locator('text=/\\$1,000\\.00|1,000\\.00/')
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('text=Generous Donor')
    ).toBeVisible();

    // Check for edit button
    await expect(
      authenticatedPage.locator('button:has-text("Edit"), a:has-text("Edit")')
    ).toBeVisible();
  });

  test('should edit donation details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account and donation
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Edit Test Donor',
      }
    );

    const { id: donationId } = await createTestDonation(
      authenticatedPage,
      authToken,
      {
        accountId,
        amount: 100.0,
        paymentStatus: 'pending',
      }
    );

    // Navigate to donation detail page
    await authenticatedPage.goto(`/donations/${donationId}`);

    // Click edit button
    await authenticatedPage.click('text=/Edit/i');

    // Wait for edit form
    await authenticatedPage.waitForURL(/\/donations\/[a-f0-9-]+\/edit/);

    // Change payment status
    await authenticatedPage.selectOption(
      'select[name="paymentStatus"]',
      'completed'
    );

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect back to detail page
    await authenticatedPage.waitForURL(`/donations/${donationId}`);

    // Check updated status is displayed
    await expect(
      authenticatedPage.locator('text=/Completed|Paid/i')
    ).toBeVisible();
  });

  test('should delete donation', async ({ authenticatedPage, authToken }) => {
    // Create test account and donation
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Delete Test Donor',
      }
    );

    const { id: donationId } = await createTestDonation(
      authenticatedPage,
      authToken,
      {
        accountId,
        amount: 50.0,
      }
    );

    // Navigate to donation detail page
    await authenticatedPage.goto(`/donations/${donationId}`);

    // Click delete button
    await authenticatedPage.click('button:has-text("Delete")');

    // Confirm deletion in modal
    await authenticatedPage.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should redirect to donations list
    await authenticatedPage.waitForURL('/donations');

    // Navigate to deleted donation (should show 404 or redirect)
    await authenticatedPage.goto(`/donations/${donationId}`);

    // Should show error or redirect
    await expect(
      authenticatedPage.locator('text=/not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should mark receipt as sent', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';

    // Create test account and donation
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Receipt Test Donor',
        email: 'receipt@example.com',
      }
    );

    const { id: donationId } = await createTestDonation(
      authenticatedPage,
      authToken,
      {
        accountId,
        amount: 250.0,
        paymentStatus: 'completed',
      }
    );

    // Navigate to donation detail page
    await authenticatedPage.goto(`/donations/${donationId}`);

    // Look for "Send Receipt" button
    const sendReceiptButton = authenticatedPage.locator(
      'button:has-text("Send Receipt"), button:has-text("Email Receipt")'
    );

    if (await sendReceiptButton.isVisible()) {
      await sendReceiptButton.click();

      // Wait for receipt to be sent
      await authenticatedPage.waitForTimeout(1000);

      // Should show receipt sent confirmation
      await expect(
        authenticatedPage.locator('text=/Receipt Sent|Sent/i')
      ).toBeVisible();
    } else {
      // Alternative: Mark as sent via API
      await authenticatedPage.request.post(
        `${apiURL}/api/donations/${donationId}/receipt`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { sent: true },
        }
      );

      // Reload page
      await authenticatedPage.reload();

      // Should show receipt sent status
      await expect(
        authenticatedPage.locator('text=/Receipt.*Sent/i')
      ).toBeVisible();
    }
  });

  test('should filter donations by payment status', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Filter Test Donor',
      }
    );

    // Create donations with different statuses
    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 100.0,
      paymentStatus: 'completed',
    });

    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 200.0,
      paymentStatus: 'pending',
    });

    await authenticatedPage.goto('/donations');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by completed status
    const statusFilter = authenticatedPage.locator('select[name="paymentStatus"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('completed');
      await authenticatedPage.waitForTimeout(1000);

      // Should show completed donation
      await expect(
        authenticatedPage.locator('text=/\\$100\\.00|100\\.00/')
      ).toBeVisible();

      // Should not show pending donation
      await expect(
        authenticatedPage.locator('text=/\\$200\\.00|200\\.00/')
      ).not.toBeVisible();
    }
  });

  test('should filter donations by payment method', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Method Test Donor',
      }
    );

    // Create donations with different payment methods
    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 100.0,
      paymentMethod: 'credit_card',
    });

    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 200.0,
      paymentMethod: 'bank_transfer',
    });

    await authenticatedPage.goto('/donations');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by credit card
    const methodFilter = authenticatedPage.locator('select[name="paymentMethod"]');
    if (await methodFilter.isVisible()) {
      await methodFilter.selectOption('credit_card');
      await authenticatedPage.waitForTimeout(1000);

      // Should show credit card donation
      await expect(
        authenticatedPage.locator('text=/\\$100\\.00|100\\.00/')
      ).toBeVisible();
    }
  });

  test('should display donation summary statistics', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Stats Test Donor',
      }
    );

    // Create multiple donations
    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 100.0,
      paymentStatus: 'completed',
    });

    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 200.0,
      paymentStatus: 'completed',
    });

    await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 150.0,
      paymentStatus: 'completed',
    });

    await authenticatedPage.goto('/donations');
    await authenticatedPage.waitForTimeout(1000);

    // Should show total amount ($450)
    await expect(
      authenticatedPage.locator('text=/\\$450|450\\.00/')
    ).toBeVisible();

    // Should show average (150) or count (3)
    const hasSummary =
      (await authenticatedPage.locator('text=/\\$150|150\\.00/').count()) > 0 ||
      (await authenticatedPage.locator('text=/3.*donation/i').count()) > 0;

    expect(hasSummary).toBeTruthy();
  });

  test('should handle recurring donations', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Recurring Donor',
        email: 'recurring@example.com',
      }
    );

    await authenticatedPage.goto('/donations/new');

    // Fill form
    const accountSelect = authenticatedPage.locator('select[name="accountId"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption(accountId);
    }

    await authenticatedPage.fill('input[name="amount"]', '50.00');

    // Check for recurring donation checkbox
    const recurringCheckbox = authenticatedPage.locator(
      'input[type="checkbox"][name="isRecurring"]'
    );

    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();

      // Select frequency
      const frequencySelect = authenticatedPage.locator('select[name="frequency"]');
      if (await frequencySelect.isVisible()) {
        await frequencySelect.selectOption('monthly');
      }

      // Submit form
      await authenticatedPage.click('button[type="submit"]');

      // Should redirect to donation detail page
      await authenticatedPage.waitForURL(/\/donations\/[a-f0-9-]+$/);

      // Should show recurring donation indicator
      await expect(
        authenticatedPage.locator('text=/Recurring|Monthly/i')
      ).toBeVisible();
    }
  });

  test('should paginate donations list', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Pagination Test Donor',
      }
    );

    // Create 25 test donations (assuming page size is 20)
    for (let i = 1; i <= 25; i++) {
      await createTestDonation(authenticatedPage, authToken, {
        accountId,
        amount: i * 10,
      });
    }

    await authenticatedPage.goto('/donations');

    // Wait for donations to load
    await authenticatedPage.waitForTimeout(2000);

    // Should see pagination controls
    await expect(
      authenticatedPage.locator('button:has-text("Next"), text=/Next/i')
    ).toBeVisible();

    // Click next page
    await authenticatedPage.click('button:has-text("Next")');

    // Wait for page to load
    await authenticatedPage.waitForTimeout(1000);

    // Should show donations from page 2
    await expect(
      authenticatedPage.locator('text=/Page 2|2 of/i')
    ).toBeVisible();
  });
});
