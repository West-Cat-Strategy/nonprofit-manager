import { test, expect } from '../fixtures/auth.fixture';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';
import type { ConsoleMessage, Page } from '@playwright/test';

const benignConsolePatterns = [
  /favicon\.ico/i,
  /ResizeObserver loop limit exceeded/i,
  /Failed to load resource: the server responded with a status of 404/i,
  /Failed to load resource: the server responded with a status of (401|403|404|410|500)/i,
  /Failed to fetch CSRF token:/i,
];

const trackRuntimeIssues = (page: Page) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  const onPageError = (error: Error) => {
    pageErrors.push(error.message);
  };

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== 'error') {
      return;
    }
    const text = message.text();
    if (benignConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }
    consoleErrors.push(text);
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  return {
    pageErrors,
    consoleErrors,
    detach: () => {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    },
  };
};

const expectNoRuntimeIssues = (
  routeLabel: string,
  issues: { pageErrors: string[]; consoleErrors: string[] }
): void => {
  expect(
    issues.pageErrors,
    `${routeLabel} threw page errors:\\n${issues.pageErrors.join('\\n')}`
  ).toEqual([]);
  expect(
    issues.consoleErrors,
    `${routeLabel} emitted console errors:\\n${issues.consoleErrors.join('\\n')}`
  ).toEqual([]);
};

test.describe('UI/UX regression flows', () => {
  test('global navigation and dashboard shell remain operable', async ({ authenticatedPage }) => {
    const runtimeIssues = trackRuntimeIssues(authenticatedPage);

    await authenticatedPage.setViewportSize({ width: 1440, height: 900 });
    await authenticatedPage.goto('/dashboard');
    const nav = authenticatedPage.locator('nav').first();
    await expect(nav.getByRole('button', { name: /user menu/i })).toBeVisible();

    await nav.getByRole('button', { name: /theme settings/i }).click();
    await expect(authenticatedPage.getByText(/switch to (light|dark)/i)).toBeVisible();
    await authenticatedPage.keyboard.press('Escape');

    await nav.getByRole('button', { name: /^search$/i }).click();
    await expect(nav.getByRole('dialog', { name: /search people/i })).toBeVisible();

    expectNoRuntimeIssues('dashboard shell', runtimeIssues);
    runtimeIssues.detach();
  });

  test('core app route headings and primary actions remain available', async ({ authenticatedPage }) => {
    const runtimeIssues = trackRuntimeIssues(authenticatedPage);

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

    expectNoRuntimeIssues('core app headings/actions', runtimeIssues);
    runtimeIssues.detach();
  });

  test('portal high-traffic routes remain navigable with headings', async ({ page }) => {
    const runtimeIssues = trackRuntimeIssues(page);

    const portalUser = await provisionApprovedPortalUser(page);
    await loginPortalUserUI(page, portalUser);

    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: /welcome to your portal/i })).toBeVisible();

    await page.goto('/portal/events');
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();

    await page.goto('/portal/profile');
    await expect(page.getByRole('heading', { name: /your profile/i })).toBeVisible();

    expectNoRuntimeIssues('portal high-traffic routes', runtimeIssues);
    runtimeIssues.detach();
  });
});
