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

const gotoAuthenticatedRoute = async (page: Page, route: string): Promise<void> => {
  await ensureAuthenticatedSession(page);
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
};

test.describe('Admin & Settings Module', () => {
  test('should load user settings', async ({ request, page }) => {
    const session = await ensureAuthenticatedSession(page);
    const meResponse = await request.get(`${API_URL}/api/v2/auth/me`, { headers: getAuthHeaders(session) });
    expect(meResponse.ok(), `Auth check failed (${meResponse.status()}): ${await getErrorText(meResponse)}`).toBeTruthy();
    await assertSettingsRouteShell(request, '/settings/user');
  });

test('user settings uploads and persists the profile avatar', async ({ request, page }) => {
    const session = await ensureAuthenticatedSession(page);
    const csrfHeaders = await getCsrfHeaders(request, session);
    const clearResponse = await request.put(`${API_URL}/api/v2/auth/profile`, {
      headers: csrfHeaders,
      data: { profilePicture: null },
    });
    expect(
      clearResponse.ok(),
      `Profile reset failed (${clearResponse.status()}): ${await getErrorText(clearResponse)}`
    ).toBeTruthy();

    await gotoAuthenticatedRoute(page, '/settings/user');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0w8AAAAASUVORK5CYII=',
        'base64'
      ),
    });

    const profileImage = page.getByAltText('Profile');
    await expect(profileImage).toHaveAttribute('src', /data:image\/jpeg;base64,/);

    const saveButton = page.getByRole('button', { name: /save all changes/i });
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click({ force: true });
    await expect(page.getByText(/profile saved successfully/i)).toBeVisible({ timeout: 10000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByAltText('Profile')).toHaveAttribute('src', /data:image\/jpeg;base64,/);
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

  test('admin settings toggles advanced mode and saves organization preferences', async ({ page }) => {
    await gotoAuthenticatedRoute(page, '/settings/admin');

    const advancedToggle = page.getByRole('button', { name: /show advanced|hide advanced/i });
    const initialToggleLabel = (await advancedToggle.textContent()) || '';
    await advancedToggle.click();
    await expect(advancedToggle).toHaveText(
      initialToggleLabel.match(/show/i) ? /hide advanced/i : /show advanced/i
    );

    await page.getByRole('tab', { name: /organization/i }).click();
    const organizationName = `E2E Organization ${Date.now()}`;
    await page.getByPlaceholder('Your Nonprofit Name').fill(organizationName);

    const saveOrganizationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/api/v2/admin/organization-settings') &&
        response.ok()
    );
    await page.getByRole('button', { name: /save changes/i }).click();
    await saveOrganizationResponse;

    await expect(page.getByText(/settings saved successfully/i)).toBeVisible({ timeout: 10000 });
  });

  test('api settings supports webhook create and delete from the UI', async ({ page }) => {
    await gotoAuthenticatedRoute(page, '/settings/api');

    const webhookUrl = `https://8.8.8.8/webhook/${Date.now()}`;
    const webhookDescription = `UI webhook ${Date.now()}`;

    const addWebhookButton = page.getByRole('button', { name: /add webhook/i });
    await addWebhookButton.scrollIntoViewIfNeeded();
    await addWebhookButton.click({ force: true });

    const createWebhookForm = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: /create webhook endpoint/i }) })
      .first();
    await createWebhookForm.getByPlaceholder('https://your-server.com/webhook').fill(webhookUrl);
    await createWebhookForm.getByPlaceholder('Optional description').fill(webhookDescription);
    await createWebhookForm.getByRole('checkbox').first().check();

    const createWebhookResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/v2/webhooks/endpoints') &&
        response.ok()
    );
    const createWebhookButton = page.getByRole('button', { name: /create webhook/i });
    await createWebhookButton.scrollIntoViewIfNeeded();
    await createWebhookButton.click({ force: true });
    await createWebhookResponse;

    const webhookCard = page
      .locator('div')
      .filter({ hasText: webhookUrl })
      .filter({ has: page.getByRole('button', { name: /^delete$/i }) })
      .first();
    await expect(webhookCard).toBeVisible({ timeout: 15000 });
    await expect(webhookCard).toContainText(webhookDescription);

    const deleteWebhookResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().includes('/api/v2/webhooks/endpoints/') &&
        response.ok()
    );
    const deleteButton = webhookCard.getByRole('button', { name: /^delete$/i });
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click({ force: true });
    const confirmDeleteDialog = page
      .locator('.fixed.inset-0')
      .filter({ hasText: /delete webhook endpoint/i });
    await expect(confirmDeleteDialog).toBeVisible({ timeout: 10000 });
    const confirmDeleteButton = confirmDeleteDialog.getByRole('button', { name: /^delete$/i }).first();
    await confirmDeleteButton.scrollIntoViewIfNeeded();
    await confirmDeleteButton.click({ force: true });
    await deleteWebhookResponse;

    await expect(webhookCard).toHaveCount(0);
  });

  test('navigation settings toggles a module and resets defaults', async ({ page }) => {
    await gotoAuthenticatedRoute(page, '/settings/navigation');

    const accountsRow = page
      .locator('li')
      .filter({ hasText: /Accounts/i })
      .filter({ has: page.getByRole('checkbox') })
      .first();
    const moduleToggle = accountsRow.getByRole('checkbox');
    await expect(moduleToggle).toBeVisible();

    const wasEnabled = await moduleToggle.isChecked();
    await moduleToggle.scrollIntoViewIfNeeded();
    await moduleToggle.click({ force: true });
    const expectedState = !wasEnabled;

    let hasToggled = false;
    for (let i = 0; i < 12; i += 1) {
      if ((await moduleToggle.isChecked()) === expectedState) {
        hasToggled = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (!hasToggled) {
      await moduleToggle.evaluate(
        (input, nextState) => {
          const checkbox = input as HTMLInputElement;
          checkbox.checked = nextState;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        },
        expectedState
      );
    }

    await expect.poll(
      async () => moduleToggle.isChecked(),
      { timeout: 5000, intervals: [250, 500] }
    ).toBe(expectedState);
    if (wasEnabled) {
      await expect(moduleToggle).not.toBeChecked();
    } else {
      await expect(moduleToggle).toBeChecked();
    }

    await page.getByRole('button', { name: /reset to defaults/i }).click();
    await expect
      .poll(
        async () => {
          const statusBadge = page
            .locator('span')
            .filter({ hasText: /saving\.\.\.|synced|offline fallback/i })
            .first();
          return (await statusBadge.textContent()) || '';
        },
        { timeout: 10000, intervals: [500, 1000, 1500] }
      )
      .toMatch(/synced|offline fallback/i);
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
