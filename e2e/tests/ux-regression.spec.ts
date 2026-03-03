import { test, expect } from '../fixtures/auth.fixture';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';

test.describe('UI/UX regression flows', () => {
  test('global navigation and dashboard shell remain operable', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 1440, height: 900 });
    await authenticatedPage.goto('/dashboard');
    const nav = authenticatedPage.locator('nav').first();
    await expect(nav.getByRole('button', { name: /user menu/i })).toBeVisible();

    await nav.getByRole('button', { name: /theme settings/i }).click();
    await expect(authenticatedPage.getByText(/switch to (light|dark)/i)).toBeVisible();
    await authenticatedPage.keyboard.press('Escape');

    await nav.getByRole('button', { name: /^search$/i }).click();
    await expect(nav.getByRole('dialog', { name: /search people/i })).toBeVisible();
  });

  test('core app route headings and primary actions remain available', async ({ authenticatedPage }) => {
    const checks: Array<{ path: string; heading: RegExp; action: RegExp }> = [
      { path: '/contacts', heading: /people/i, action: /new person/i },
      { path: '/cases', heading: /cases/i, action: /new case/i },
      { path: '/donations', heading: /donations/i, action: /record donation/i },
      { path: '/reports/templates', heading: /report templates/i, action: /create custom report/i },
      { path: '/settings/navigation', heading: /navigation settings/i, action: /reset to defaults/i },
    ];

    for (const check of checks) {
      await authenticatedPage.goto(check.path);
      await expect(authenticatedPage.getByRole('heading', { name: check.heading }).first()).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: check.action }).first()).toBeVisible();
    }
  });

  test('portal high-traffic routes remain navigable with headings', async ({ page }) => {
    const portalUser = await provisionApprovedPortalUser(page);
    await loginPortalUserUI(page, portalUser);

    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: /welcome to your portal/i })).toBeVisible();

    await page.goto('/portal/events');
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();

    await page.goto('/portal/profile');
    await expect(page.getByRole('heading', { name: /your profile/i })).toBeVisible();
  });
});
