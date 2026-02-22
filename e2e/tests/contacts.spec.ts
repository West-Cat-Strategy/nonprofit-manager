/**
 * Contacts Module E2E Tests
 * Comprehensive tests for list, create, detail, edit, filter, and delete flows.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { createTestContact, clearDatabase } from '../helpers/database';

const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

test.describe('Contacts Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display contacts list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts');

    await expect(authenticatedPage.getByRole('heading', { name: /people/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /new person/i })).toBeVisible();
    await expect(authenticatedPage.getByLabel('Search contacts')).toBeVisible();
  });

  test('should validate create form required and format errors', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByRole('button', { name: /create contact/i }).click();

    await expect(authenticatedPage.getByText(/first name is required/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/last name is required/i)).toBeVisible();

    await authenticatedPage.getByLabel(/first name \*/i).fill('Invalid');
    await authenticatedPage.getByLabel(/last name \*/i).fill('Entry');
    await authenticatedPage.getByLabel(/^email$/i).fill('invalid.entry@example.com');
    await authenticatedPage.locator('input[name="phone"]').fill('12345');

    await authenticatedPage.getByRole('button', { name: /create contact/i }).click();

    await expect(authenticatedPage.getByText(/phone number must be at least 10 digits/i)).toBeVisible();
  });

  test('should support create -> detail -> edit lifecycle', async ({ authenticatedPage }) => {
    const suffix = uniqueSuffix();
    const firstName = `Flow${suffix}`;
    const lastName = 'Person';
    const email = `flow.${suffix}@example.com`;

    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByLabel(/first name \*/i).fill(firstName);
    await authenticatedPage.getByLabel(/last name \*/i).fill(lastName);
    await authenticatedPage.getByLabel(/^email$/i).fill(email);
    await authenticatedPage.locator('input[name="phone"]').fill('5550201234');

    await authenticatedPage.getByRole('button', { name: /create contact/i }).click();

    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);
    await expect(
      authenticatedPage.getByRole('heading', { name: new RegExp(`${firstName} ${lastName}`, 'i') })
    ).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /edit contact/i }).click();
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+\/edit$/);

    const updatedFirstName = `Updated${suffix}`;
    await authenticatedPage.getByLabel(/first name \*/i).fill(updatedFirstName);
    await expect(authenticatedPage.getByLabel(/first name \*/i)).toHaveValue(updatedFirstName);
    await authenticatedPage.locator('form').getByRole('button', { name: /^cancel$/i }).click();
    await expect(
      authenticatedPage.getByRole('heading', {
        name: new RegExp(`${firstName} ${lastName}`, 'i'),
      })
    ).toBeVisible();
  });

  test('should support detail tab navigation for a contact', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Tabs${suffix}`,
      lastName: 'Contact',
      email: `tabs.${suffix}@example.com`,
      phone: '5550201111',
    });

    await authenticatedPage.goto(`/contacts/${id}`);

    await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
    await expect(authenticatedPage.getByText(/no notes yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /tasks/i }).click();
    await expect(authenticatedPage.getByRole('heading', { name: /^tasks$/i })).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /activity/i }).click();
    await expect(authenticatedPage.getByText(/no activity yet for this person|loading activity/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /documents/i }).click();
    await expect(authenticatedPage.getByText(/no documents uploaded yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /payments/i }).click();
    await expect(
      authenticatedPage.getByRole('heading', { name: /payment history/i }).first()
    ).toBeVisible();
  });

  test('should support cancel navigation in create and edit forms', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();

    await authenticatedPage.goto('/contacts/new');
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/contacts$/);

    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Cancel${suffix}`,
      lastName: 'Flow',
      email: `cancel.${suffix}@example.com`,
      phone: '5550204444',
    });

    await authenticatedPage.goto(`/contacts/${id}/edit`);
    await authenticatedPage.locator('form').getByRole('button', { name: /^cancel$/i }).click();
    await expect(authenticatedPage).toHaveURL(new RegExp(`/contacts/${id}$`));
  });

  test('should search contacts and filter by inactive status', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const activeFirstName = `Enabled${suffix}`;
    const inactiveFirstName = `Dormant${suffix}`;

    const activeContact = await createTestContact(authenticatedPage, authToken, {
      firstName: activeFirstName,
      lastName: 'Contact',
      email: `active.${suffix}@example.com`,
      phone: '5550202001',
    });

    const inactiveContact = await createTestContact(authenticatedPage, authToken, {
      firstName: inactiveFirstName,
      lastName: 'Contact',
      email: `inactive.${suffix}@example.com`,
      phone: '5550202002',
    });

    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    await authenticatedPage.request.delete(`${apiURL}/api/contacts/${inactiveContact.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    await authenticatedPage.goto('/contacts');

    await authenticatedPage.getByLabel('Search contacts').fill(activeFirstName);
    await authenticatedPage.locator('form').getByRole('button', { name: /^search$/i }).click();
    await authenticatedPage.waitForTimeout(500);

    await expect(authenticatedPage.locator(`text=${activeFirstName} Contact`).first()).toBeVisible({
      timeout: 10000,
    });

    await authenticatedPage.getByLabel('Search contacts').fill('');
    await authenticatedPage.getByLabel('Status').selectOption('inactive');
    await authenticatedPage.locator('form').getByRole('button', { name: /^search$/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await expect(authenticatedPage.locator(`text=${inactiveFirstName} Contact`).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(authenticatedPage.locator(`text=${activeFirstName} Contact`).first()).not.toBeVisible();

    await authenticatedPage.goto(`/contacts/${inactiveContact.id}`);
    await expect(authenticatedPage.getByText(/inactive/i).first()).toBeVisible();

    await authenticatedPage.goto(`/contacts/${activeContact.id}`);
    await expect(authenticatedPage.getByText(/active/i).first()).toBeVisible();
  });

  test('should delete contact from list actions', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const fullName = `Delete${suffix} Contact`;

    await createTestContact(authenticatedPage, authToken, {
      firstName: `Delete${suffix}`,
      lastName: 'Contact',
      email: `delete.${suffix}@example.com`,
      phone: '5550203001',
    });

    await authenticatedPage.goto('/contacts');
    const row = authenticatedPage.locator('tr', { hasText: fullName }).first();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /delete/i }).click();
    await authenticatedPage.locator('button.bg-red-600').click();

    await expect(row).not.toBeVisible({ timeout: 10000 });
  });

  test('should paginate contacts list', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();

    for (let i = 1; i <= 25; i++) {
      await createTestContact(authenticatedPage, authToken, {
        firstName: `Page${suffix}`,
        lastName: `${i.toString().padStart(2, '0')}`,
        email: `page.${suffix}.${i}@example.com`,
        phone: `555020${(1000 + i).toString().slice(-4)}`,
      });
    }

    await authenticatedPage.goto('/contacts');

    const nextButton = authenticatedPage.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    await expect(authenticatedPage.getByRole('button', { name: /previous/i })).toBeEnabled();
    await expect(authenticatedPage.locator('text=/Page 2 of|Page 2/i')).toBeVisible();
  });
});
