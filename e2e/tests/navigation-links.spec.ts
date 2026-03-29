import { test as base, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import {
  loginPortalUserUI,
  provisionApprovedPortalUser,
  type ProvisionedPortalUser,
} from '../helpers/portal';

authTest.describe('Staff navigation click-through audit', () => {
  authTest('utility links and alerts workspace routes stay canonical', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await authenticatedPage.getByRole('link', { name: /alerts/i }).first().click();
    await expect(authenticatedPage).toHaveURL(/\/alerts$/);

    await authenticatedPage.getByRole('link', { name: /view triggered alerts/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/alerts\/instances$/);

    await authenticatedPage.getByRole('link', { name: /review history/i }).first().click();
    await expect(authenticatedPage).toHaveURL(/\/alerts\/history$/);

    await authenticatedPage.getByRole('link', { name: /edit alert rules/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/alerts$/);
  });

  authTest('admin settings canonical section routes preserve selected tabs', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/settings/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(authenticatedPage).toHaveURL(/\/settings\/admin\/users$/);
    await expect(authenticatedPage.getByRole('tab', { name: /^users & security$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await authenticatedPage.goto('/settings/admin/audit_logs', { waitUntil: 'domcontentloaded' });
    await expect(authenticatedPage).toHaveURL(/\/settings\/admin\/audit_logs$/);
    await expect(authenticatedPage.getByRole('tab', { name: /^audit logs$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

base.describe('Portal navigation click-through audit', () => {
  let portalUser: ProvisionedPortalUser;

  base.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    portalUser = await provisionApprovedPortalUser(page, {
      firstName: 'Portal',
      lastName: 'Audit',
      email: `portal-navigation-audit-${Date.now()}@example.com`,
      password: 'Portal123!@#',
    });
    await context.close();
  });

  base.beforeEach(async ({ page }) => {
    await loginPortalUserUI(page, portalUser);
  });

  base('sidebar links stay within the portal shell', async ({ page }) => {
    await page.goto('/portal', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /your case workspace/i })).toBeVisible();

    const linkChecks: Array<{ label: RegExp; url: RegExp }> = [
      { label: /^view shared cases$/i, url: /\/portal\/cases$/ },
      { label: /^message staff$/i, url: /\/portal\/messages$/ },
      { label: /^manage appointments$/i, url: /\/portal\/appointments$/ },
      { label: /^shared documents$/i, url: /\/portal\/documents$/ },
      { label: /^account settings$/i, url: /\/portal\/profile$/ },
    ];

    for (const { label, url } of linkChecks) {
      const link = page.getByRole('link', { name: label }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(url);
      await page.goto('/portal', { waitUntil: 'domcontentloaded' });
    }
  });
});
