import { test as base, expect } from '@playwright/test';
import '../helpers/testEnv';
import { test as authTest } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const publicRoutes = [
  '/',
  '/login',
  '/setup',
  '/accept-invitation/test-token',
  '/portal/login',
  '/portal/signup',
  '/portal/accept-invitation/test-token',
  '/demo/dashboard',
  '/demo/linking',
  '/demo/operations',
  '/demo/outreach',
  '/demo/people',
  '/demo/audit',
];

const authenticatedRoutes = [
  '/dashboard',
  '/accounts',
  '/contacts',
  '/volunteers',
  '/events',
  '/donations',
  '/tasks',
  '/workflows',
  '/people',
  '/linking',
  '/operations',
  '/outreach',
];

const assertRouteLoads = async (page: Page, route: string) => {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response, `no response for ${route}`).not.toBeNull();
  if (response) {
    expect(response.status(), `bad status for ${route}`).toBeLessThan(400);
  }
};

base.describe('Public route health', () => {
  for (const route of publicRoutes) {
    base(`loads ${route}`, async ({ page }) => {
      await assertRouteLoads(page, route);
    });
  }
});

authTest.describe('Authenticated route health', () => {
  for (const route of authenticatedRoutes) {
    authTest(`loads ${route}`, async ({ authenticatedPage }) => {
      await assertRouteLoads(authenticatedPage, route);
    });
  }
});
