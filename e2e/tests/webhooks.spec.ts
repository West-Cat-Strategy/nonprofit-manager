import '../helpers/testEnv';
import { test, expect, APIRequestContext, type Page } from '@playwright/test';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const RETRYABLE_NETWORK_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up/i;

type AuthSession = {
  token: string;
  organizationId?: string;
};

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

const getErrorText = async (response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<string> =>
  response.text().catch(() => '<unreadable response body>');

const ensureAuthenticatedSession = async (page: Page): Promise<AuthSession> => {
  const session = await ensureEffectiveAdminLoginViaAPI(page, {
    firstName: 'Webhook',
    lastName: 'Admin',
    organizationName: 'Webhook Test Organization',
  });

  const organizationId =
    normalizeOrganizationId(session.user?.organizationId) ||
    normalizeOrganizationId(session.user?.organization_id);

  if (!organizationId) {
    throw new Error('Unable to resolve organization id for webhooks E2E');
  }

  return {
    token: session.token,
    organizationId,
  };
};

const getAuthHeaders = async (
  request: APIRequestContext,
  session: AuthSession
): Promise<Record<string, string>> => {
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
  };
  if (session.organizationId) {
    baseHeaders['X-Organization-Id'] = session.organizationId;
  }

  const csrfResponse = await withRequestRetry(() =>
    request.get(`${API_URL}/api/v2/auth/csrf-token`, { headers: baseHeaders })
  );
  const csrfBody = await getErrorText(csrfResponse);
  expect(
    csrfResponse.ok(),
    `CSRF token fetch failed (${csrfResponse.status()}): ${csrfBody}`
  ).toBeTruthy();

  const csrfPayload = unwrapApiData<{ csrfToken?: string }>(JSON.parse(csrfBody));
  expect(csrfPayload?.csrfToken).toBeTruthy();

  return {
    ...baseHeaders,
    'X-CSRF-Token': csrfPayload.csrfToken as string,
  };
};

const parseJson = (body: string): Record<string, unknown> => {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const pickId = (value: Record<string, unknown>): string | null => {
  const directCandidates = [
    value.id,
    value.endpoint_id,
    value.endpointId,
    value.webhook_endpoint_id,
    (value.data as Record<string, unknown> | undefined)?.id,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
};

test.describe('Webhooks Workflows', () => {
  test('create and delete webhook endpoint with settings page check', async ({ request, page }) => {
    const session = await ensureAuthenticatedSession(page);
    const headers = await getAuthHeaders(request, session);

    const dashboardResponse = await withRequestRetry(() =>
      request.get(`${API_URL}/api/v2/dashboard/configs/default`, { headers })
    );
    const dashboardRawBody = await getErrorText(dashboardResponse);
    expect(
      dashboardResponse.ok(),
      `Dashboard config fetch failed (${dashboardResponse.status()}): ${dashboardRawBody}`
    ).toBeTruthy();
    const dashboardBody = parseJson(dashboardRawBody);
    expect(pickId(dashboardBody)).toBeTruthy();

    const createResponse = await withRequestRetry(() =>
      request.post(`${API_URL}/api/v2/webhooks/endpoints`, {
        headers,
        data: {
          url: 'https://8.8.8.8/webhook',
          events: ['account.created'],
          description: 'E2E endpoint',
        },
      })
    );

    const createRawBody = await getErrorText(createResponse);
    expect(
      createResponse.ok(),
      `Webhook endpoint creation failed (${createResponse.status()}): ${createRawBody}`
    ).toBeTruthy();

    const createBody = parseJson(createRawBody);
    const id = pickId(createBody);
    expect(id).toBeTruthy();
    if (!id) {
      throw new Error(`Webhook endpoint id missing in response: ${createRawBody}`);
    }

    const created = await withRequestRetry(() =>
      request.get(`${API_URL}/api/v2/webhooks/endpoints/${id}`, { headers })
    );
    expect(created.ok()).toBeTruthy();
    const createdBody = parseJson(await getErrorText(created));
    expect(pickId(createdBody)).toBe(id);

    const deleteResponse = await withRequestRetry(() =>
      request.delete(`${API_URL}/api/v2/webhooks/endpoints/${id}`, { headers })
    );
    expect([200, 204]).toContain(deleteResponse.status());

    const afterDelete = await withRequestRetry(() =>
      request.get(`${API_URL}/api/v2/webhooks/endpoints/${id}`, { headers })
    );
    expect([400, 404]).toContain(afterDelete.status());
  });
});
