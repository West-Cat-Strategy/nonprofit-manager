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
];

const waitForAppRoute = async (page: Page): Promise<void> => {
  const loadingText = page.getByText('Loading...').first();
  if (await loadingText.isVisible().catch(() => false)) {
    await loadingText.waitFor({ state: 'detached', timeout: 30_000 });
  }
  await page.waitForLoadState('domcontentloaded');
};

const assertPrimaryAuthForm = async (page: Page): Promise<void> => {
  if (page.url().includes('/setup')) {
    await expect(page.getByRole('heading', { name: /build your nonprofit workspace in minutes/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="organizationName"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /create admin account/i })).toBeVisible();
    return;
  }

  await expect(page.getByRole('heading', { name: /welcome back to nonprofit manager/i })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
};

const trackRuntimeErrors = (page: Page) => {
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
