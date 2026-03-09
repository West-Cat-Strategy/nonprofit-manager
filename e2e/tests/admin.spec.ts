import '../helpers/testEnv';
import { test, expect, APIRequestContext, Page } from '@playwright/test';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';

type LoginPayload = {
  token: string;
  user: {
    id?: string;
    role?: string;
    organizationId?: string;
    organization_id?: string;
  };
  organizationId?: string;
  organization_id?: string;
};

type AuthSession = {
  token: string;
  organizationId?: string;
  userRole?: string;
};

const RETRYABLE_NETWORK_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up/i;

const unwrapApiData = <T>(payload: unknown): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    (payload as { success?: unknown }).success === true &&
    'data' in (payload as object)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const normalizeOrganizationId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getPathWithQuery = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getTokenOrganizationId = (token: string): string | undefined => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return undefined;
  }
  return (
    normalizeOrganizationId(payload.organizationId) ||
    normalizeOrganizationId(payload.organization_id)
  );
};

const getErrorText = async (response: Awaited<ReturnType<APIRequestContext['post']>>): Promise<string> =>
  response.text().catch(() => '<unreadable error body>');

const isRetryableNetworkError = (error: unknown): boolean =>
  error instanceof Error && RETRYABLE_NETWORK_ERROR.test(error.message);

async function withRequestRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

const ensureAuthenticatedSession = async (page: Page): Promise<AuthSession> => {
  const elevatedSession = await ensureEffectiveAdminLoginViaAPI(page, {
    firstName: 'Admin',
    lastName: 'User',
    organizationName: 'E2E Organization',
  });

  const organizationId =
    normalizeOrganizationId(elevatedSession.user?.organizationId) ||
    normalizeOrganizationId(elevatedSession.user?.organization_id) ||
    getTokenOrganizationId(elevatedSession.token);

  const userRole =
    typeof elevatedSession.user?.role === 'string' ? elevatedSession.user.role : undefined;

  return {
    token: elevatedSession.token,
    organizationId,
    userRole,
  };
};

const getAuthHeaders = (session: AuthSession): Record<string, string> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
  };
  if (session.organizationId) {
    headers['X-Organization-Id'] = session.organizationId;
  }
  return headers;
};

const getCsrfHeaders = async (
  request: APIRequestContext,
  session: AuthSession
): Promise<Record<string, string>> => {
  const csrfResponse = await withRequestRetry(() =>
    request.get(`${API_URL}/api/v2/auth/csrf-token`, {
      headers: getAuthHeaders(session),
    })
  );
  const csrfBodyText = await getErrorText(csrfResponse);
  expect(
    csrfResponse.ok(),
    `CSRF token fetch failed (${csrfResponse.status()}): ${csrfBodyText}`
  ).toBeTruthy();
  const csrfPayload = unwrapApiData<{ csrfToken?: string }>(JSON.parse(csrfBodyText));
  expect(csrfPayload?.csrfToken).toBeTruthy();

  return {
    ...getAuthHeaders(session),
    'X-CSRF-Token': csrfPayload.csrfToken as string,
  };
};

const assertSettingsRouteShell = async (request: APIRequestContext, route: string): Promise<void> => {
  const response = await request.get(`${BASE_URL}${route}`);
  const body = await response.text();
  expect(response.ok(), `Route ${route} failed (${response.status()}): ${body.slice(0, 300)}`).toBeTruthy();
  expect(body).toMatch(/id=["']root["']/i);
};

test.describe('Admin & Settings Module', () => {
  test('should load user settings', async ({ request, page }) => {
    const session = await ensureAuthenticatedSession(page);
    const meResponse = await request.get(`${API_URL}/api/v2/auth/me`, { headers: getAuthHeaders(session) });
    expect(meResponse.ok(), `Auth check failed (${meResponse.status()}): ${await getErrorText(meResponse)}`).toBeTruthy();
    await assertSettingsRouteShell(request, '/settings/user');
  });

  test('should load API settings', async ({ request, page }) => {
    await ensureAuthenticatedSession(page);
    await assertSettingsRouteShell(request, '/settings/api');
  });

  test('should load navigation settings', async ({ request, page }) => {
    await ensureAuthenticatedSession(page);
    await assertSettingsRouteShell(request, '/settings/navigation');
  });

  test('should load email marketing settings', async ({ request, page }) => {
    await ensureAuthenticatedSession(page);
    await assertSettingsRouteShell(request, '/settings/email-marketing');
  });

  test('should load admin settings hub shell', async ({ request, page }) => {
    await ensureAuthenticatedSession(page);
    await assertSettingsRouteShell(request, '/settings/admin');
  });

  test('should load portal admin settings route shells', async ({ request, page }) => {
    await ensureAuthenticatedSession(page);
    const portalRoutes = [
      '/settings/admin/portal',
      '/settings/admin/portal/access',
      '/settings/admin/portal/users',
      '/settings/admin/portal/conversations',
      '/settings/admin/portal/appointments',
      '/settings/admin/portal/slots',
    ];
    for (const route of portalRoutes) {
      await assertSettingsRouteShell(request, route);
    }
  });

  test('legacy settings compatibility routes are not supported', async ({ page }) => {
    await ensureAuthenticatedSession(page);
    const legacyRoutes = [
      { route: '/email-marketing', canonical: '/settings/email-marketing' },
      { route: '/admin/audit-logs', canonical: '/settings/admin/audit_logs' },
      { route: '/settings/organization', canonical: '/settings/admin/organization' },
    ];

    for (const { route, canonical } of legacyRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      const currentPath = getPathWithQuery(page.url());
      expect(
        currentPath,
        `Legacy route ${route} should not resolve to canonical ${canonical}`
      ).not.toBe(canonical);
      expect(['/dashboard', '/login']).toContain(new URL(page.url()).pathname);
    }
  });

  test('admin can create and disable an outcome definition', async ({ request, page }) => {
    const session = await ensureAuthenticatedSession(page);
    const role = session.userRole?.toLowerCase();

    const headers = await getCsrfHeaders(request, session);
    const key = `e2e_outcome_${Date.now()}`;

    const createResponse = await withRequestRetry(() =>
      request.post(`${API_URL}/api/v2/admin/outcomes`, {
        headers,
        data: {
          key,
          name: `E2E Outcome ${Date.now()}`,
          description: 'Created during e2e test',
          category: 'test',
          isActive: true,
          isReportable: true,
        },
      })
    );
    const createBodyText = await getErrorText(createResponse);
    if (role !== 'admin') {
      expect([401, 403]).toContain(createResponse.status());
      return;
    }

    expect(
      createResponse.ok(),
      `Outcome creation failed (${createResponse.status()}): ${createBodyText}`
    ).toBeTruthy();
    const createdPayload = unwrapApiData<Record<string, unknown>>(JSON.parse(createBodyText));
    const createdOutcome = (createdPayload.data as Record<string, unknown> | undefined) || createdPayload;
    expect(createdOutcome?.key).toBe(key);

    const createdId = createdOutcome?.id as string | undefined;
    expect(createdId).toBeTruthy();

    const disableResponse = await request.post(
      `${API_URL}/api/v2/admin/outcomes/${createdId}/disable`,
      { headers }
    );
    const disableBodyText = await getErrorText(disableResponse);
    expect(
      disableResponse.ok(),
      `Outcome disable failed (${disableResponse.status()}): ${disableBodyText}`
    ).toBeTruthy();
    const disablePayload = unwrapApiData<Record<string, unknown>>(JSON.parse(disableBodyText));
    const disabledOutcome = (disablePayload.data as Record<string, unknown> | undefined) || disablePayload;
    expect(disabledOutcome?.is_active).toBe(false);
  });
});
