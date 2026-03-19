import { test, testWithCleanDB, expect } from '../fixtures/auth.fixture';
import { createTestContact } from '../helpers/database';
import { expectCriticalSection, waitForPageReady } from '../helpers/routeHelpers';

const PEOPLE_DIRECTORY_ROUTE = '/people';

const buildUniqueName = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test('people directory requires authentication', async ({ page }) => {
  await page.goto(PEOPLE_DIRECTORY_ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

testWithCleanDB('starts empty on a clean database before any contacts exist', async ({ authenticatedPage }) => {
  await authenticatedPage.goto(PEOPLE_DIRECTORY_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/people(?:\?|$)/,
    selectors: [
      'h2:has-text("DIRECTORY")',
      'input[aria-label="Search people"]',
      'button:has-text("ALL PEOPLE")',
    ],
    timeoutMs: 25000,
  });

  await expect(authenticatedPage.getByRole('heading', { name: 'No People Found' })).toBeVisible();
  await expect(authenticatedPage.getByText('No people in this category')).toBeVisible();
});

test('loads people directory and supports search, tabs, and new item action', async ({ authenticatedPage, authToken }) => {
  const firstName = buildUniqueName('E2E');
  const lastName = 'Directory';

  await createTestContact(authenticatedPage, authToken, {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.com`,
  });

  await authenticatedPage.goto(PEOPLE_DIRECTORY_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/people(?:\?|$)/,
    selectors: [
      'h2:has-text("DIRECTORY")',
      'input[aria-label="Search people"]',
      'button:has-text("ALL PEOPLE")',
      'button:has-text("+ NEW ITEM")',
    ],
    timeoutMs: 25000,
  });

  await expectCriticalSection(authenticatedPage, [
    'button:has-text("STAFF")',
    'button:has-text("VOLUNTEERS")',
    'button:has-text("BOARD")',
  ]);

  const fullName = `${firstName} ${lastName}`;
  await authenticatedPage.fill('input[aria-label="Search people"]', fullName);
  await authenticatedPage.waitForTimeout(400);
  await expect(authenticatedPage.getByText(fullName).first()).toBeVisible({ timeout: 15000 });

  await authenticatedPage.getByRole('button', { name: 'STAFF' }).click();
  await expect(authenticatedPage.getByRole('button', { name: 'STAFF' })).toBeVisible();

  await authenticatedPage.getByRole('button', { name: '+ NEW ITEM' }).click();
  await expect(authenticatedPage).toHaveURL('/contacts/new');
});
