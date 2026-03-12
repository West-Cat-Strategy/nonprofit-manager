import { test, expect } from '../fixtures/auth.fixture';
import { createTestContact } from '../helpers/database';
import { waitForPageReady } from '../helpers/routeHelpers';

const INTERACTIONS_ROUTE = '/interactions/new';

const buildUniqueName = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test('interactions new route requires authentication', async ({ page }) => {
  await page.goto(INTERACTIONS_ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('creates a note flow and validates required content', async ({ authenticatedPage, authToken }) => {
  const firstName = buildUniqueName('Person');
  const lastName = 'Interaction';
  const fullName = `${firstName} ${lastName}`;

  const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.org`,
  });

  await authenticatedPage.goto(INTERACTIONS_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/interactions\/new(?:\?|$)/,
    selectors: [
      'h1:has-text("Note an Interaction")',
      '#interaction-note-person-search',
      'button:has-text("Create new person")',
    ],
    timeoutMs: 25000,
  });

  await authenticatedPage.fill('#interaction-note-person-search', fullName);
  await expect(authenticatedPage.getByRole('button', { name: fullName })).toBeVisible({ timeout: 15000 });
  await authenticatedPage.getByRole('button', { name: fullName }).first().click();

  await expect(authenticatedPage.getByText(`For ${fullName}`)).toBeVisible({ timeout: 15000 });

  await authenticatedPage.getByRole('button', { name: 'Save Note' }).click();
  await expect(authenticatedPage.getByText('Please enter note content.')).toBeVisible({ timeout: 10000 });

  await authenticatedPage.getByPlaceholder('Brief summary').fill('Follow-up interaction note');
  await authenticatedPage.getByPlaceholder('Record the interaction details...').fill('Contacted team about opportunity follow-up.');
  await authenticatedPage.getByRole('button', { name: 'Save Note' }).click();

  await expect(authenticatedPage).toHaveURL(new RegExp(`\\/contacts\\/${contactId}(?:\\?|$)`), {
    timeout: 20000,
  });
});
