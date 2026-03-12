import { test, expect } from '../fixtures/auth.fixture';
import { expectCriticalSection, waitForPageReady } from '../helpers/routeHelpers';

const OPPORTUNITIES_ROUTE = '/opportunities';

const buildUniqueName = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test('opportunities route requires authentication', async ({ page }) => {
  await page.goto(OPPORTUNITIES_ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('renders opportunities board and supports stage/opportunity creation', async ({ authenticatedPage }) => {
  await authenticatedPage.goto(OPPORTUNITIES_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/opportunities(?:\?|$)/,
    selectors: [
      'h1:has-text("Opportunities")',
      'button:has-text("New Opportunity")',
      'button:has-text("Add Stage")',
      'input[aria-label="New opportunity stage name"]',
    ],
    timeoutMs: 25000,
  });

  await expectCriticalSection(authenticatedPage, [
    'button:has-text("New Opportunity")',
  ]);

  const stageName = buildUniqueName('E2E Stage');
  await authenticatedPage.fill('input[aria-label="New opportunity stage name"]', stageName);
  await authenticatedPage.getByRole('button', { name: 'Add Stage' }).click();
  await expect(authenticatedPage.locator(`h3:has-text("${stageName}")`)).toBeVisible({ timeout: 15000 });

  const opportunityName = buildUniqueName('Pipeline Opportunity');
  await authenticatedPage.getByRole('button', { name: 'New Opportunity' }).click();

  const createOpportunityForm = authenticatedPage.locator('form:has-text("Create Opportunity")');
  await createOpportunityForm.getByRole('textbox', { name: 'Name' }).fill(opportunityName);
  await createOpportunityForm.getByRole('spinbutton', { name: 'Amount' }).fill('1850');
  await createOpportunityForm.getByRole('button', { name: 'Save Opportunity' }).click();

  await expect(authenticatedPage.getByText(opportunityName).first()).toBeVisible({ timeout: 15000 });
});
