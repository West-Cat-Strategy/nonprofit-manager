import { test, expect } from '../fixtures/auth.fixture';
import { createTestAccount } from '../helpers/database';
import { expectCriticalSection, waitForPageReady } from '../helpers/routeHelpers';

const LINKING_ROUTE = '/linking';
const OPERATIONS_ROUTE = '/operations';
const OUTREACH_ROUTE = '/outreach';

const buildUniqueName = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test('linking route requires authentication', async ({ page }) => {
  await page.goto(LINKING_ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('displays linking module and supports creating a partnership record', async ({ authenticatedPage, authToken }) => {
  const orgName = buildUniqueName('E2E Partner');
  await createTestAccount(authenticatedPage, authToken, {
    name: orgName,
    accountType: 'organization',
    category: 'partner',
    email: `${orgName.toLowerCase().replace(/\s+/g, '-') }@example.org`,
  });

  await authenticatedPage.goto(LINKING_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/linking(?:\?|$)/,
    selectors: [
      'h2:has-text("Linking Network")',
      'button:has-text("+ NEW ITEM")',
      'input[aria-label="Search partnerships"]',
      'th:has-text("ORGANIZATION")',
    ],
    timeoutMs: 25000,
  });

  await expect(authenticatedPage.getByText(orgName).first()).toBeVisible({ timeout: 15000 });
  await authenticatedPage.getByRole('button', { name: '+ NEW ITEM' }).click();
  await expect(authenticatedPage).toHaveURL('/accounts/new');
});

test('operations route renders kanban columns and responds to filters', async ({ authenticatedPage }) => {
  await authenticatedPage.goto(OPERATIONS_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/operations(?:\?|$)/,
    selectors: [
      'h2:has-text("OPERATIONS")',
      'div:has-text("TO DO")',
      'div:has-text("IN PROGRESS")',
      'div:has-text("DONE")',
      'button:has-text("FILTER")',
      'button:has-text("SORT")',
    ],
    timeoutMs: 25000,
  });

  await expectCriticalSection(authenticatedPage, [
    'button:has-text("FILTER")',
    'button:has-text("SORT")',
  ]);

  await authenticatedPage.getByRole('button', { name: 'FILTER' }).click();
  await authenticatedPage.getByRole('button', { name: /tech/i }).click();
  await expect(authenticatedPage.getByRole('button', { name: 'FILTER (TECH)' })).toBeVisible();

  await authenticatedPage.getByRole('button', { name: 'FILTER (TECH)' }).click();
  await authenticatedPage.getByRole('button', { name: 'All Categories' }).click();
  await expect(authenticatedPage.getByRole('button', { name: 'FILTER' })).toBeVisible();

  await authenticatedPage.getByRole('button', { name: 'SORT' }).click();
  await authenticatedPage.getByRole('button', { name: /Title/i }).click();
});

test('outreach route exposes primary campaign actions', async ({ authenticatedPage }) => {
  await authenticatedPage.goto(OUTREACH_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/outreach(?:\?|$)/,
    selectors: [
      'h2:has-text("Campaign Central")',
      'input[aria-label="Search outreach campaigns"]',
      'button:has-text("NEW BLAST")',
      'button:has-text("VIEW REPORTS")',
      'button:has-text("NEW ITEM")',
    ],
    timeoutMs: 25000,
  });

  await authenticatedPage.getByRole('button', { name: 'NEW BLAST' }).click();
  await expect(authenticatedPage).toHaveURL(/\/contacts\?action=email/);

  await authenticatedPage.goto(OUTREACH_ROUTE, { waitUntil: 'domcontentloaded' });
  await authenticatedPage.getByRole('button', { name: 'VIEW REPORTS' }).click();
  await expect(authenticatedPage).toHaveURL('/analytics');
});
