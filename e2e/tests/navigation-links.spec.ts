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

  authTest('admin settings tabs preserve path-based canonical sections', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/settings/admin', { waitUntil: 'domcontentloaded' });

    await authenticatedPage.getByRole('tab', { name: /^users & security$/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/settings\/admin\/users$/);

    await authenticatedPage
      .getByRole('region', { name: /admin quick actions/i })
      .getByRole('link', { name: /^audit logs\b/i })
      .click();
    await expect(authenticatedPage).toHaveURL(/\/settings\/admin\/audit_logs$/);
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
    const portalNav = page.getByRole('navigation', { name: /browse portal/i });

    await portalNav.getByRole('link', { name: /^appointments$/i }).click();
    await expect(page).toHaveURL(/\/portal\/appointments$/);

    await portalNav.getByRole('link', { name: /^documents$/i }).click();
    await expect(page).toHaveURL(/\/portal\/documents$/);

    await portalNav.getByRole('link', { name: /^account$/i }).click();
    await expect(page).toHaveURL(/\/portal\/profile$/);
  });
});
