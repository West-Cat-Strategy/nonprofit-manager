import { test as base, expect, type ConsoleMessage, type Request, type Response } from '@playwright/test';
import '../helpers/testEnv';
import { test as authTest } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { getAuthHeaders } from '../helpers/database';
import { loginPortalUserUI, provisionApprovedPortalUser, type ProvisionedPortalUser } from '../helpers/portal';
import { adminRouteManifest } from '../../frontend/src/features/adminOps/adminRouteManifest';
import { normalizeRouteLocation } from '../../frontend/src/routes/routeCatalog';

const HTTP_SCHEME = ['http', '://'].join('');
const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
const baseURL = process.env.BASE_URL || `${HTTP_SCHEME}127.0.0.1:5173`;
const runtimeOrigins = new Set([new URL(baseURL).origin, new URL(apiURL).origin]);
const authBootstrapRequestPatterns = [
  /\/api\/(?:v2\/)?auth\/csrf-token(?:\?|$)/,
  /\/api\/(?:v2\/)?auth\/me(?:\?|$)/,
  /\/api\/(?:v2\/)?auth\/bootstrap(?:\?|$)/,
  /\/api\/(?:v2\/)?auth\/registration-status(?:\?|$)/,
  /\/api\/(?:v2\/)?auth\/setup-status(?:\?|$)/,
];

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

type RouteRuntimeIssueTracker = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  failedResponses: string[];
  detach: () => void;
};

const routeErrorResourceTypes = new Set(['fetch', 'xhr', 'script', 'stylesheet']);
const abortErrorPatterns = [/net::ERR_ABORTED/i, /net::ERR_BLOCKED_BY_CLIENT/i, /NS_BINDING_ABORTED/i];

const isRuntimeBootstrapAllowed = (url: string, allowAuthBootstrapNoise: boolean): boolean =>
  allowAuthBootstrapNoise && authBootstrapRequestPatterns.some((pattern) => pattern.test(url));

const trackRouteRuntimeIssues = (
  page: Page,
  options: { allowAuthBootstrapNoise?: boolean } = {}
): RouteRuntimeIssueTracker => {
  const { allowAuthBootstrapNoise = false } = options;
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const requestFailures: string[] = [];
  const failedResponses: string[] = [];

  const onPageError = (error: Error) => {
    pageErrors.push(error.message);
  };

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== 'error') {
      return;
    }

    const text = message.text();
    if (/favicon\.ico/i.test(text) || /ResizeObserver loop limit exceeded/i.test(text)) {
      return;
    }

    if (
      allowAuthBootstrapNoise &&
      authBootstrapRequestPatterns.some((pattern) => pattern.test(text)) &&
      /status of (?:401|403)/i.test(text)
    ) {
      return;
    }

    consoleErrors.push(text);
  };

  const onRequestFailed = (request: Request) => {
    const resourceType = request.resourceType();
    if (!routeErrorResourceTypes.has(resourceType)) {
      return;
    }

    if (!runtimeOrigins.has(new URL(request.url()).origin)) {
      return;
    }

    const failure = request.failure()?.errorText || 'unknown failure';
    if (abortErrorPatterns.some((pattern) => pattern.test(failure))) {
      return;
    }

    requestFailures.push(`${resourceType} ${request.url()} (${failure})`);
  };

  const onResponse = (response: Response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (!routeErrorResourceTypes.has(resourceType)) {
      return;
    }

    if (!runtimeOrigins.has(new URL(response.url()).origin)) {
      return;
    }

    const status = response.status();
    if (status < 400) {
      return;
    }

    const url = response.url();
    if (isRuntimeBootstrapAllowed(url, allowAuthBootstrapNoise) && (status === 401 || status === 403)) {
      return;
    }

    failedResponses.push(`${resourceType} ${request.method()} ${url} (${status})`);
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  return {
    pageErrors,
    consoleErrors,
    requestFailures,
    failedResponses,
    detach: () => {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
      page.off('requestfailed', onRequestFailed);
      page.off('response', onResponse);
    },
  };
};

const expectRouteRuntimeClean = (route: string, issues: RouteRuntimeIssueTracker): void => {
  expect(issues.pageErrors, `${route} threw page errors:\n${issues.pageErrors.join('\n')}`).toEqual([]);
  expect(issues.consoleErrors, `${route} emitted console errors:\n${issues.consoleErrors.join('\n')}`).toEqual(
    []
  );
  expect(
    issues.requestFailures,
    `${route} had request failures:\n${issues.requestFailures.join('\n')}`
  ).toEqual([]);
  expect(
    issues.failedResponses,
    `${route} had failed network responses:\n${issues.failedResponses.join('\n')}`
  ).toEqual([]);
};

const waitForRouteToSettle = async (page: Page): Promise<void> => {
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
};

const assertRouteLoads = async (page: Page, route: string, options: { allowAuthBootstrapNoise?: boolean } = {}) => {
  const runtimeIssues = trackRouteRuntimeIssues(page, options);
  try {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${route}`).not.toBeNull();
    if (response) {
      expect(response.status(), `bad status for ${route}`).toBeLessThan(400);
    }
    await waitForRouteToSettle(page);
    expectRouteRuntimeClean(route, runtimeIssues);
  } finally {
    runtimeIssues.detach();
  }
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
  for (const route of publicRoutes) {
    base(`loads ${route}`, async ({ page }) => {
      await assertRouteLoads(page, route, { allowAuthBootstrapNoise: true });
    });
  }
});

authTest.describe('Authenticated staff route health', () => {
  for (const route of staffAuthenticatedRoutes) {
    authTest(`loads ${route}`, async ({ authenticatedPage }) => {
      await assertRouteLoads(authenticatedPage, route);
    });
  }

  authTest('cases new route keeps Save Case primary action visible', async ({ authenticatedPage }) => {
    await assertRouteLoads(authenticatedPage, '/cases/new');
    const saveCaseButton = authenticatedPage.getByTestId('case-form-primary-submit');
    await expect(saveCaseButton).toBeVisible();
    await expect(saveCaseButton).toHaveText(/save case/i);
  });

  for (const { path, redirectsTo } of legacyRedirectRoutes) {
    authTest(`legacy route ${path} resolves to ${redirectsTo}`, async ({ authenticatedPage }) => {
      await assertRouteLoads(authenticatedPage, path);
      expect(normalizeRouteLocation(authenticatedPage.url())).toBe(normalizeRouteLocation(redirectsTo));
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
    await assertRouteLoads(page, `/portal/cases/${portalFixture.caseId}`);
    await expect(page).toHaveURL(new RegExp(`/portal/cases/${portalFixture.caseId}(?:\\?|$)`));
    await expect(page.getByRole('heading', { name: portalFixture.caseTitle, level: 1 })).toBeVisible();
  });
});
