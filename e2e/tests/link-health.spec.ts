import { test as base, expect } from '@playwright/test';
import '../helpers/testEnv';
import { test as authTest } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { getAuthHeaders } from '../helpers/database';
import { loginPortalUserUI, provisionApprovedPortalUser, type ProvisionedPortalUser } from '../helpers/portal';
import { adminRouteManifest } from '../../frontend/src/features/adminOps/adminRouteManifest';
import { captureRouteRuntime, type RouteRuntimeSnapshot } from '../helpers/darkModeAudit';

const apiURL = process.env.API_URL || 'http://127.0.0.1:3001';

type RouteExpectation = {
  route: string;
  expectedLocation?: string | string[];
};

const publicRoutes: RouteExpectation[] = [
  { route: '/', expectedLocation: ['/login', '/setup'] },
  { route: '/login', expectedLocation: ['/login', '/setup'] },
  { route: '/setup', expectedLocation: ['/setup', '/login'] },
  { route: '/accept-invitation/test-token', expectedLocation: ['/accept-invitation/test-token', '/setup'] },
  { route: '/portal/login' },
  { route: '/portal/signup' },
  { route: '/portal/accept-invitation/test-token' },
  { route: '/demo/dashboard' },
  { route: '/demo/linking' },
  { route: '/demo/operations' },
  { route: '/demo/outreach' },
  { route: '/demo/people' },
  { route: '/demo/audit' },
];

const staffAuthenticatedRoutes = [
  '/dashboard',
  '/accounts',
  '/accounts/new',
  '/contacts',
  '/contacts/new',
  '/volunteers',
  '/volunteers/new',
  '/events',
  '/events/calendar',
  '/events/check-in',
  '/events/new',
  '/tasks',
  '/tasks/new',
  '/cases',
  '/cases/new',
  '/external-service-providers',
  '/follow-ups',
  '/opportunities',
  '/donations',
  '/donations/new',
  '/donations/payment',
  '/donations/payment-result',
  '/reconciliation',
  '/people',
  '/linking',
  '/operations',
  '/outreach',
  '/analytics',
  '/alerts',
  '/alerts/instances',
  '/alerts/history',
  '/dashboard/custom',
  '/reports',
  '/reports/builder',
  '/reports/templates',
  '/reports/saved',
  '/reports/scheduled',
  '/reports/outcomes',
  '/intake/new',
  '/interactions/new',
  '/settings/email-marketing',
  '/settings/api',
  '/settings/navigation',
  '/settings/user',
  '/settings/admin/dashboard',
  '/settings/admin/organization',
  '/settings/admin/communications',
  '/settings/admin/audit_logs',
  '/settings/admin/portal/access',
  '/settings/admin/portal/users',
  '/settings/admin/portal/conversations',
  '/settings/admin/portal/appointments',
  '/settings/admin/portal/slots',
  '/settings/backup',
  '/website-builder',
];

const isRedirectRoute = (
  entry: (typeof adminRouteManifest)[number]
): entry is Extract<(typeof adminRouteManifest)[number], { kind: 'redirect' }> => entry.kind === 'redirect';

const legacyRedirectRoutes = adminRouteManifest.filter(isRedirectRoute);

const portalAuthenticatedRoutes = [
  '/portal',
  '/portal/profile',
  '/portal/people',
  '/portal/events',
  '/portal/messages',
  '/portal/cases',
  '/portal/appointments',
  '/portal/documents',
  '/portal/notes',
  '/portal/forms',
  '/portal/reminders',
];

const expectRouteRuntimeClean = (route: string, snapshot: RouteRuntimeSnapshot): void => {
  expect(
    snapshot.navigationErrors,
    `${route} had navigation errors:\n${snapshot.navigationErrors.join('\n')}`
  ).toEqual([]);
  expect(
    snapshot.pageErrors,
    `${route} threw page errors:\n${snapshot.pageErrors.join('\n')}`
  ).toEqual([]);
  expect(
    snapshot.requestFailures,
    `${route} had request failures:\n${snapshot.requestFailures.join('\n')}`
  ).toEqual([]);
  expect(
    snapshot.failedResponses,
    `${route} had failed network responses:\n${snapshot.failedResponses.join('\n')}`
  ).toEqual([]);
  expect(
    snapshot.consoleErrors,
    `${route} emitted console errors:\n${snapshot.consoleErrors.join('\n')}`
  ).toEqual([]);
};

const assertRouteLoads = async (
  page: Page,
  route: string,
  options: { allowAuthBootstrapNoise?: boolean; expectedLocation?: string | string[] } = {}
) => {
  // The shared runtime capture now filters benign same-origin churn cancellations after the
  // route settles, so this check stays strict on real 4xx/5xx, console, and page errors.
  const runtimeSnapshot = await captureRouteRuntime(page, route, options);
  expectRouteRuntimeClean(route, runtimeSnapshot);
};

type CaseTypeRow = {
  id?: string;
};

type ProvisionedPortalCase = {
  user: ProvisionedPortalUser;
  caseId: string;
  caseTitle: string;
};

const provisionPortalCaseFixture = async (page: Page): Promise<ProvisionedPortalCase> => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const portalUser = await provisionApprovedPortalUser(page, {
    firstName: 'Link',
    lastName: 'Health',
    email: `portal-link-health-${uniqueSuffix}@example.com`,
    password: 'Portal123!@#',
  });
  const headers = await getAuthHeaders(page, portalUser.adminToken);
  const caseTypesResponse = await page.request.get(`${apiURL}/api/v2/cases/types`, {
    headers,
  });
  expect(caseTypesResponse.ok(), `Failed to fetch case types: ${await caseTypesResponse.text()}`).toBeTruthy();
  const caseTypesPayload = unwrapSuccess<Array<CaseTypeRow> | { types?: Array<CaseTypeRow> }>(
    await caseTypesResponse.json()
  );
  const caseTypes = Array.isArray(caseTypesPayload) ? caseTypesPayload : caseTypesPayload?.types || [];
  const caseTypeId = caseTypes.find((row) => typeof row.id === 'string' && row.id.length > 0)?.id;
  expect(caseTypeId, 'No case type id returned while provisioning portal case fixture').toBeTruthy();

  const caseTitle = `Portal Link Health Case ${uniqueSuffix}`;
  const createCaseResponse = await page.request.post(`${apiURL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: portalUser.contactId,
      account_id: portalUser.accountId,
      case_type_id: caseTypeId,
      title: caseTitle,
      description: 'Route health portal case fixture',
      client_viewable: true,
    },
  });
  expect(createCaseResponse.ok(), `Failed to create portal fixture case: ${await createCaseResponse.text()}`).toBeTruthy();
  const casePayload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(
    await createCaseResponse.json()
  );
  const caseId = casePayload.id || casePayload.data?.id;
  expect(caseId, 'Missing case id from fixture case response').toBeTruthy();

  const shareResponse = await page.request.put(`${apiURL}/api/v2/cases/${caseId}/client-viewable`, {
    headers,
    data: {
      client_viewable: true,
    },
  });
  expect(shareResponse.ok(), `Failed to mark fixture case as client-viewable: ${await shareResponse.text()}`).toBeTruthy();

  return {
    user: portalUser,
    caseId: String(caseId),
    caseTitle,
  };
};

base.describe('Public route health', () => {
  for (const { route, expectedLocation } of publicRoutes) {
    base(`loads ${route}`, async ({ page }) => {
      await assertRouteLoads(page, route, { allowAuthBootstrapNoise: true, expectedLocation });
    });
  }
});

authTest.describe('Authenticated staff route health', () => {
  for (const route of staffAuthenticatedRoutes) {
    authTest(`loads ${route}`, async ({ authenticatedPage }) => {
      await assertRouteLoads(authenticatedPage, route, { allowAuthBootstrapNoise: true });
    });
  }

  authTest('cases new route keeps Save Case primary action visible', async ({ authenticatedPage }) => {
    await assertRouteLoads(authenticatedPage, '/cases/new', { allowAuthBootstrapNoise: true });
    const saveCaseButton = authenticatedPage.getByTestId('case-form-primary-submit');
    await expect(saveCaseButton).toBeVisible();
    await expect(saveCaseButton).toHaveText(/save case/i);
  });

  for (const { path, redirectsTo } of legacyRedirectRoutes) {
    authTest(`legacy route ${path} resolves to ${redirectsTo}`, async ({ authenticatedPage }) => {
      await assertRouteLoads(authenticatedPage, path, {
        allowAuthBootstrapNoise: true,
        expectedLocation: redirectsTo,
      });
    });
  }
});

base.describe('Authenticated portal route health', () => {
  let portalFixture: ProvisionedPortalCase;

  base.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    portalFixture = await provisionPortalCaseFixture(page);
    await context.close();
  });

  base.beforeEach(async ({ page }) => {
    await loginPortalUserUI(page, portalFixture.user);
  });

  for (const route of portalAuthenticatedRoutes) {
    base(`loads ${route}`, async ({ page }) => {
      await assertRouteLoads(page, route, { allowAuthBootstrapNoise: true });
    });
  }

  base('loads /portal/cases/:id using a fixture-linked portal user', async ({ page }) => {
    await assertRouteLoads(page, `/portal/cases/${portalFixture.caseId}`, {
      allowAuthBootstrapNoise: true,
    });
    await expect(page).toHaveURL(new RegExp(`/portal/cases/${portalFixture.caseId}(?:\\?|$)`));
    await expect(page.getByRole('heading', { name: portalFixture.caseTitle, level: 1 })).toBeVisible();
  });
});
