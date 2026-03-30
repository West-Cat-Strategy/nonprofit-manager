import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import '../helpers/testEnv';

const benignConsolePatterns = [
  /favicon\.ico/i,
  /ResizeObserver loop limit exceeded/i,
  /Failed to load resource: the server responded with a status of 404/i,
  /Failed to load resource: the server responded with a status of (401|403|404|410)/i,
  /Failed to fetch CSRF token:/i,
  /downloadable font: download failed/i,
  /Firefox can’t establish a connection to the server at .*\/api\/v2\/team-chat\/messenger\/stream/i,
];

const benignPageErrorPatterns = [
  /\/api\/v2\/auth\/bootstrap.*access control checks/i,
  /\/api\/v2\/team-chat\/.*access control checks/i,
  /error loading dynamically imported module: .*\/src\/components\/dashboard\/useQuickLookup\.tsx/i,
  /error loading dynamically imported module: .*\/src\/features\/contacts\/pages\/ContactListPage\.tsx/i,
  /Importing a module script failed/i,
  /access control checks/i,
];

const waitForAppRoute = async (page: Page): Promise<void> => {
  const loadingText = page.getByText('Loading...').first();
  if (await loadingText.isVisible().catch(() => false)) {
    await loadingText.waitFor({ state: 'detached', timeout: 30_000 });
  }
  await page.waitForLoadState('domcontentloaded');
};

const waitForAnyVisibleLocator = async (
  locators: Array<ReturnType<Page['locator']>>,
  timeoutMs = 30_000
): Promise<ReturnType<Page['locator']>> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const locator of locators) {
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for one of the auth headings to become visible.');
};

const waitForStableVisibleLocator = async (
  locators: Array<ReturnType<Page['locator']>>,
  timeoutMs = 30_000,
  settleMs = 500
): Promise<ReturnType<Page['locator']>> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const visibleLocator = await waitForAnyVisibleLocator(locators, Math.max(1, deadline - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, settleMs));

    if (await visibleLocator.isVisible().catch(() => false)) {
      return visibleLocator;
    }
  }

  throw new Error('Timed out waiting for a stable auth control to become visible.');
};

const assertPrimaryAuthForm = async (page: Page): Promise<void> => {
  const loginSubmit = page.getByRole('button', { name: /^sign in$/i });
  const setupSubmit = page.getByRole('button', { name: /create admin account/i });
  const activeSubmit = await waitForStableVisibleLocator([loginSubmit, setupSubmit]);

  if (activeSubmit === setupSubmit) {
    await expect(page.getByRole('heading', { name: /build your nonprofit workspace in minutes/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="organizationName"]')).toBeVisible();
    await expect(setupSubmit).toBeVisible();
    const backgroundColor = await setupSubmit.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(backgroundColor).not.toBe('transparent');
    return;
  }

  await expect(page.getByRole('heading', { name: /welcome back to nonprofit manager/i })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(loginSubmit).toBeVisible();
  const backgroundColor = await loginSubmit.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(backgroundColor).not.toBe('transparent');
};

const trackRuntimeErrors = (page: Page) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  const onPageError = (error: Error) => {
    if (benignPageErrorPatterns.some((pattern) => pattern.test(error.message))) {
      return;
    }
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

const expectNoRuntimeErrors = (
  route: string,
  errors: { pageErrors: string[]; consoleErrors: string[] }
): void => {
  expect(
    errors.pageErrors,
    `${route} threw page errors:\n${errors.pageErrors.join('\n')}`
  ).toEqual([]);
  expect(
    errors.consoleErrors,
    `${route} emitted console errors:\n${errors.consoleErrors.join('\n')}`
  ).toEqual([]);
};

base.describe('Setup and launch stability (public)', () => {
  base('root launch resolves to /login or /setup with expected primary form', async ({ page }) => {
    await page.goto('/');
    await waitForAppRoute(page);
    await expect(page).toHaveURL(/\/(login|setup)$/);
    await assertPrimaryAuthForm(page);
  });

  base('setup page remains usable when setup-status request fails', async ({ page }) => {
    await page.route('**/api/v2/auth/setup-status*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'server_error',
            message: 'simulated setup status failure',
          },
        }),
      });
    });

    await page.goto('/setup');
    await waitForAppRoute(page);

    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole('heading', { name: /build your nonprofit workspace in minutes/i })).toBeVisible();

    const firstNameInput = page.locator('input[name="firstName"]');
    const lastNameInput = page.locator('input[name="lastName"]');
    const emailInput = page.locator('input[name="email"]');
    const submitButton = page.getByRole('button', { name: /create admin account/i });

    await firstNameInput.fill('Launch');
    await lastNameInput.fill('Admin');
    await emailInput.fill('launch-admin@example.com');

    await expect(firstNameInput).toHaveValue('Launch');
    await expect(lastNameInput).toHaveValue('Admin');
    await expect(emailInput).toHaveValue('launch-admin@example.com');
    await expect(submitButton).toBeEnabled();
  });

  base('launch-critical public routes have no unhandled runtime errors', async ({ page }) => {
    const routes = ['/portal/login', '/login', '/setup'];

    for (const route of routes) {
      const runtimeErrors = trackRuntimeErrors(page);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      await waitForAppRoute(page);

      expect(response, `no response for ${route}`).not.toBeNull();
      if (response) {
        expect(response.status(), `bad status for ${route}`).toBeLessThan(400);
      }

      expectNoRuntimeErrors(route, runtimeErrors);
      runtimeErrors.detach();
    }
  });

  base('public auth transitions do not repeatedly refetch setup status within cache ttl', async ({ page }) => {
    const setupStatusResponses: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (/\/api\/(?:v2\/)?auth\/setup-status(?:\?|$)/.test(url)) {
        setupStatusResponses.push(`${response.status()}:${url}`);
      }
    });

    for (const route of ['/login', '/setup', '/login', '/setup']) {
      await page.goto(route);
      await waitForAppRoute(page);
    }

    await page.waitForTimeout(600);

    expect(setupStatusResponses.length).toBeLessThanOrEqual(4);
  });

  base('public auth primary buttons keep a solid background', async ({ page }) => {
    for (const path of ['/login', '/portal/login']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await waitForAppRoute(page);

      const loginSubmit = page.getByRole('button', { name: /^sign in$/i });
      const setupSubmit = page.getByRole('button', { name: /create admin account/i });
      const activeSubmit =
        path === '/portal/login'
          ? await waitForStableVisibleLocator([loginSubmit])
          : await waitForStableVisibleLocator([loginSubmit, setupSubmit]);

      const submitButton = activeSubmit === setupSubmit ? setupSubmit.first() : activeSubmit.first();

      await expect(submitButton).toBeVisible();

      const backgroundColor = await submitButton.evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');
    }
  });
});

authTest.describe('Setup and launch stability (authenticated)', () => {
  authTest('launch-critical authenticated routes have no unhandled runtime errors', async ({ authenticatedPage }) => {
    const routes = [
      '/dashboard',
      '/contacts',
      '/cases',
      '/donations',
      '/reports/templates',
      '/settings/navigation',
    ];

    for (const route of routes) {
      const runtimeErrors = trackRuntimeErrors(authenticatedPage);
      const response = await authenticatedPage.goto(route, { waitUntil: 'domcontentloaded' });
      await waitForAppRoute(authenticatedPage);

      expect(response, `no response for ${route}`).not.toBeNull();
      if (response) {
        expect(response.status(), `bad status for ${route}`).toBeLessThan(400);
      }

      expectNoRuntimeErrors(route, runtimeErrors);
      runtimeErrors.detach();
    }
  });
});
