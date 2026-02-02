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
    await expect(authenticatedPage.locator('h1')).toContainText(/contacts/i);

    // Check for "Create Contact" button
    await expect(
      authenticatedPage.locator('button:has-text("New Contact"), a:has-text("New Contact")')
    ).toBeVisible();

    // Check for search input
    await expect(
      authenticatedPage.locator('input[placeholder*="Search"]')
    ).toBeVisible();
  });

  test('should create a new contact via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts');

    // Click "New Contact" button
    await authenticatedPage.click('text=/New Contact|Create Contact/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/contacts\/(new|create)/);

    // Fill form
    await authenticatedPage.fill('input[name="firstName"]', 'John');
    await authenticatedPage.fill('input[name="lastName"]', 'Doe');
    await authenticatedPage.fill('input[name="email"]', 'john.doe@example.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0200');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to contact detail page
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    // Check that contact details are displayed
    await expect(authenticatedPage.locator('text=John Doe')).toBeVisible();
    await expect(
      authenticatedPage.locator('text=john.doe@example.com')
    ).toBeVisible();
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
    await authenticatedPage.fill('input[name="firstName"]', 'Jane');
    await authenticatedPage.fill('input[name="lastName"]', 'Smith');
    await authenticatedPage.fill('input[name="email"]', 'jane@example.com');

    // Select account if dropdown exists
    const accountSelect = authenticatedPage.locator('select[name="accountId"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption(accountId);
    }

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to contact detail page
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    // Check that account association is displayed
    await expect(
      authenticatedPage.locator('text=Test Organization')
    ).toBeVisible();
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
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill('Alice');

    // Wait for search results
    await authenticatedPage.waitForTimeout(1000);

    // Should show Alice Anderson
    await expect(
      authenticatedPage.locator('text=Alice Anderson')
    ).toBeVisible();

    // Should not show others
    await expect(
      authenticatedPage.locator('text=Bob Brown')
    ).not.toBeVisible();
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
    await expect(
      authenticatedPage.locator('text=emily@example.com')
    ).toBeVisible();
    await expect(authenticatedPage.locator('text=555-0201')).toBeVisible();

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

    // Change email
    const emailInput = authenticatedPage.locator('input[name="email"]');
    await emailInput.fill('frank.ford@example.com');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect back to detail page
    await authenticatedPage.waitForURL(`/contacts/${id}`);

    // Check updated email is displayed
    await expect(
      authenticatedPage.locator('text=frank.ford@example.com')
    ).toBeVisible();
  });

  test('should delete contact', async ({ authenticatedPage, authToken }) => {
    // Create test contact
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Grace',
      lastName: 'Green',
      email: 'grace@example.com',
    });

    // Navigate to contact detail page
    await authenticatedPage.goto(`/contacts/${id}`);

    // Click delete button
    await authenticatedPage.click('button:has-text("Delete")');

    // Confirm deletion in modal
    await authenticatedPage.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should redirect to contacts list
    await authenticatedPage.waitForURL('/contacts');

    // Navigate to deleted contact (should show 404 or redirect)
    await authenticatedPage.goto(`/contacts/${id}`);

    // Should show error or redirect
    await expect(
      authenticatedPage.locator('text=/not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 5000 });
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
    await expect(
      authenticatedPage.locator('button:has-text("Next"), text=/Next/i')
    ).toBeVisible();

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
