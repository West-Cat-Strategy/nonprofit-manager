import { test, expect } from '../fixtures/auth.fixture';
import { expectCriticalSection, waitForPageReady } from '../helpers/routeHelpers';

const SETTINGS_BACKUP_ROUTE = '/settings/backup';

test('settings backup route requires authentication', async ({ page }) => {
  await page.goto(SETTINGS_BACKUP_ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('shows backup controls and updates secrets warning state', async ({ authenticatedPage }) => {
  await authenticatedPage.goto(SETTINGS_BACKUP_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/settings\/backup(?:\?|$)/,
    selectors: [
      'h2:has-text("Export Backup")',
      'text=Export Backup',
      'input[type="checkbox"]',
      'button:has-text("Download Backup")',
      'p:has-text("For point-in-time disaster recovery")',
    ],
    timeoutMs: 25000,
  });

  await expectCriticalSection(authenticatedPage, [
    'button:has-text("Download Backup")',
    'input[type="checkbox"]',
  ]);

  const includeSecrets = authenticatedPage.locator('input[type="checkbox"]');
  await includeSecrets.check();
  await expect(
    authenticatedPage.getByText('Includes password hashes, invitation tokens, and MFA secrets. Store this file securely.')
  ).toBeVisible({ timeout: 10000 });

  await includeSecrets.uncheck();
  await expect(
    authenticatedPage.getByText('Includes password hashes, invitation tokens, and MFA secrets. Store this file securely.')
  ).not.toBeVisible();
});
