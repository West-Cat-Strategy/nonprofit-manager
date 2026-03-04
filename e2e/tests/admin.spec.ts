import '../helpers/testEnv';
import { test, expect, APIRequestContext } from '@playwright/test';
import { getSharedTestUser } from '../helpers/testUser';

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

const loginViaApi = async (
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthSession | null> => {
  const response = await withRequestRetry(() =>
    request.post(`${API_URL}/api/v2/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    })
  );
  if (!response.ok()) {
    return null;
  }

  const body = unwrapApiData<LoginPayload>(await response.json());
  const organizationId =
    normalizeOrganizationId(body.organizationId) ||
    normalizeOrganizationId(body.organization_id) ||
    normalizeOrganizationId(body.user?.organizationId) ||
    normalizeOrganizationId(body.user?.organization_id) ||
    getTokenOrganizationId(body.token);

  return {
    token: body.token,
    organizationId,
    userRole: body.user?.role,
  };
};

const ensureAuthenticatedSession = async (request: APIRequestContext): Promise<AuthSession> => {
  const adminEmail = process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com';
  const adminPassword = process.env.ADMIN_USER_PASSWORD?.trim() || 'Admin123!@#';

  const adminSession = await loginViaApi(request, adminEmail, adminPassword);
  if (adminSession) {
    return adminSession;
  }

  const sharedUser = getSharedTestUser();
  const sharedLogin = await loginViaApi(request, sharedUser.email, sharedUser.password);
  if (sharedLogin) {
    return sharedLogin;
  }

  // If the shared user does not exist yet, bootstrap it once.
  await withRequestRetry(() =>
    request.post(`${API_URL}/api/v2/auth/register`, {
      data: {
        email: sharedUser.email,
        password: sharedUser.password,
        password_confirm: sharedUser.password,
        first_name: 'Test',
        last_name: 'User',
      },
      headers: { 'Content-Type': 'application/json' },
    })
  ).catch(() => undefined);

  const loginAfterBootstrap = await loginViaApi(request, sharedUser.email, sharedUser.password);
  if (loginAfterBootstrap) {
    return loginAfterBootstrap;
  }

  throw new Error('Unable to establish authenticated session for admin E2E suite');
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
  test('should load user settings', async ({ request }) => {
    const session = await ensureAuthenticatedSession(request);
    const meResponse = await request.get(`${API_URL}/api/v2/auth/me`, { headers: getAuthHeaders(session) });
    expect(meResponse.ok(), `Auth check failed (${meResponse.status()}): ${await getErrorText(meResponse)}`).toBeTruthy();
    await assertSettingsRouteShell(request, '/settings/user');
  });

  test('should load API settings', async ({ request }) => {
    await ensureAuthenticatedSession(request);
    await assertSettingsRouteShell(request, '/settings/api');
  });

  test('should load navigation settings', async ({ request }) => {
    await ensureAuthenticatedSession(request);
    await assertSettingsRouteShell(request, '/settings/navigation');
  });

  test('should load email marketing settings', async ({ request }) => {
    await ensureAuthenticatedSession(request);
    await assertSettingsRouteShell(request, '/settings/email-marketing');
  });

  test('should load admin settings hub shell', async ({ request }) => {
    await ensureAuthenticatedSession(request);
    await assertSettingsRouteShell(request, '/settings/admin');
  });

  test('should load portal admin settings route shells', async ({ request }) => {
    await ensureAuthenticatedSession(request);
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

  test('should load compatibility redirect entry-point shells', async ({ request }) => {
    await ensureAuthenticatedSession(request);
    const compatibilityRoutes = [
      '/email-marketing',
      '/admin/audit-logs',
      '/settings/organization',
    ];
    for (const route of compatibilityRoutes) {
      await assertSettingsRouteShell(request, route);
    }
  });

  test('admin can create and disable an outcome definition', async ({ request }) => {
    const session = await ensureAuthenticatedSession(request);
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
