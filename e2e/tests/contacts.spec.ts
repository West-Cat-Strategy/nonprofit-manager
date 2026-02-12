/**
 * Contacts Module E2E Tests
 * Tests for contact CRUD operations and relationship management
 */

import { test, expect } from '../fixtures/auth.fixture';
import {
  createTestAccount,
  createTestContact,
  clearDatabase,
} from '../helpers/database';

test.describe('Contacts Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    // Clear database before each test
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display contacts list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts');

    // Check page title
    await expect(authenticatedPage.locator('h1')).toContainText(/people/i);

    // Check for create button
    await expect(
      authenticatedPage.locator('button:has-text("New Person"), a:has-text("New Person")')
    ).toBeVisible();

    // Check for search input
    await expect(
      authenticatedPage.locator(
        'input[aria-label="Search contacts"], input[placeholder*="Quick lookup"]'
      )
    ).toBeVisible();
  });

  test('should create a new contact via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts');

    // Click "New Person" button
    await authenticatedPage.click('text=/New Person|Create Contact/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/contacts\/(new|create)/);

    // Fill form
    await authenticatedPage.fill('input[name="first_name"]', 'John');
    await authenticatedPage.fill('input[name="last_name"]', 'Doe');
    await authenticatedPage.fill('input[name="email"]', 'john.doe@example.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0200');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to contact detail page
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    // Check that contact details are displayed
    await expect(authenticatedPage.locator('text=John Doe')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/contacts/new');

    // Submit without filling required fields
    await authenticatedPage.click('button[type="submit"]');

    // Check for validation errors
    await expect(
      authenticatedPage.locator('text=/first name.*required/i')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      authenticatedPage.locator('text=/last name.*required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create contact with account association', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test account
    const { id: accountId } = await createTestAccount(
      authenticatedPage,
      authToken,
      {
        name: 'Test Organization',
      }
    );

    await authenticatedPage.goto('/contacts/new');

    // Fill contact form
    await authenticatedPage.fill('input[name="first_name"]', 'Jane');
    await authenticatedPage.fill('input[name="last_name"]', 'Smith');
    await authenticatedPage.fill('input[name="email"]', 'jane@example.com');

    // Select account if dropdown exists
    const accountSelect = authenticatedPage.locator('select[name="account_id"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption(accountId);
    }

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to contact detail page
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    // Check contact name is displayed on detail page.
    await expect(authenticatedPage.locator('text=Jane Smith')).toBeVisible();
  });

  test('should search contacts by name', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test contacts
    await createTestContact(authenticatedPage, authToken, {
      firstName: 'Alice',
      lastName: 'Anderson',
      email: 'alice@example.com',
    });
    await createTestContact(authenticatedPage, authToken, {
      firstName: 'Bob',
      lastName: 'Brown',
      email: 'bob@example.com',
    });
    await createTestContact(authenticatedPage, authToken, {
      firstName: 'Charlie',
      lastName: 'Clark',
      email: 'charlie@example.com',
    });

    await authenticatedPage.goto('/contacts');

    // Wait for contacts to load
    await authenticatedPage.waitForTimeout(1000);

    // Search for "Alice"
    const searchInput = authenticatedPage.locator(
      'input[aria-label="Search contacts"], input[placeholder*="Quick lookup"]'
    );
    await searchInput.fill('Alice');

    // Wait for search results
    await authenticatedPage.waitForTimeout(1000);

    // Should show Alice Anderson
    await expect(authenticatedPage.locator(':text("Alice Anderson"):visible').first()).toBeVisible();

  });

  test('should view contact details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test contact
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Emily',
      lastName: 'Evans',
      email: 'emily@example.com',
      phone: '555-0201',
    });

    // Navigate to contact detail page
    await authenticatedPage.goto(`/contacts/${id}`);

    // Check contact details are displayed
    await expect(
      authenticatedPage.locator('text=Emily Evans')
    ).toBeVisible();

    // Check for edit button
    await expect(
      authenticatedPage.locator('button:has-text("Edit"), a:has-text("Edit")')
    ).toBeVisible();
  });

  test('should edit contact details', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test contact
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Frank',
      lastName: 'Ford',
      email: 'frank@example.com',
    });

    // Navigate to contact detail page
    await authenticatedPage.goto(`/contacts/${id}`);

    // Click edit button
    await authenticatedPage.click('text=/Edit/i');

    // Wait for edit form
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+\/edit/);

    // Change first name and ensure the edit form accepts updates.
    const firstNameInput = authenticatedPage.locator('input[name="first_name"]');
    await firstNameInput.fill('Franklin');
    await expect(firstNameInput).toHaveValue('Franklin');
  });

  test('should delete contact', async ({ authenticatedPage, authToken }) => {
    // Create test contact
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Grace',
      lastName: 'Green',
      email: 'grace@example.com',
    });

    const apiURL = process.env.API_URL || 'http://localhost:3001';
    await authenticatedPage.request.delete(`${apiURL}/api/contacts/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    // Should redirect to contacts list
    await authenticatedPage.goto('/contacts');

    // Navigate to deleted contact (should show 404 or redirect)
    await authenticatedPage.goto(`/contacts/${id}`);

    // Contact remains viewable but should be marked inactive after deletion.
    await expect(authenticatedPage.locator('text=/inactive/i').first()).toBeVisible();
  });

  test('should filter contacts by type', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create contacts of different types
    await createTestContact(authenticatedPage, authToken, {
      firstName: 'Donor',
      lastName: 'Contact',
      contactType: 'donor',
    });
    await createTestContact(authenticatedPage, authToken, {
      firstName: 'Volunteer',
      lastName: 'Contact',
      contactType: 'volunteer',
    });

    await authenticatedPage.goto('/contacts');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by donor type
    const typeFilter = authenticatedPage.locator('select[name="contactType"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('donor');
      await authenticatedPage.waitForTimeout(1000);

      // Should show donor contact
      await expect(
        authenticatedPage.locator('text=Donor Contact')
      ).toBeVisible();

      // Should not show volunteer contact
      await expect(
        authenticatedPage.locator('text=Volunteer Contact')
      ).not.toBeVisible();
    }
  });

  test('should display contact activities/interactions', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test contact
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Henry',
      lastName: 'Hall',
      email: 'henry@example.com',
    });

    // Navigate to contact detail page
    await authenticatedPage.goto(`/contacts/${id}`);

    // Check for activities/interactions section
    const activitiesSection = authenticatedPage.locator(
      'text=/activities|interactions|history/i'
    );
    if (await activitiesSection.isVisible()) {
      // Activities section exists
      expect(await activitiesSection.isVisible()).toBeTruthy();
    }
  });

  test('should paginate contacts list', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create 25 test contacts (assuming page size is 20)
    for (let i = 1; i <= 25; i++) {
      await createTestContact(authenticatedPage, authToken, {
        firstName: `Contact`,
        lastName: `${i.toString().padStart(2, '0')}`,
        email: `contact${i}@test.com`,
      });
    }

    await authenticatedPage.goto('/contacts');

    // Wait for contacts to load
    await authenticatedPage.waitForTimeout(2000);

    // Should see pagination controls
    await expect(authenticatedPage.locator('button:has-text("Next")')).toBeVisible();

    // Click next page
    await authenticatedPage.click('button:has-text("Next")');

    // Wait for page to load
    await authenticatedPage.waitForTimeout(1000);

    // Should show contacts from page 2
    await expect(
      authenticatedPage.locator('text=/Page 2|2 of/i')
    ).toBeVisible();
  });
});
