import '../helpers/testEnv';
import { test, expect, APIRequestContext } from '@playwright/test';
import { getSharedTestUser } from '../helpers/testUser';

type LoginResponse = {
  token?: string;
  organizationId?: string;
  organization_id?: string;
  user?: {
    organizationId?: string;
    organization_id?: string;
  };
};

const unwrapApiData = <T>(payload: { success?: boolean; data?: T } | T): T => {
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

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveOrganizationId = (login: LoginResponse): string | undefined =>
  normalizeString(login.organizationId) ||
  normalizeString(login.organization_id) ||
  normalizeString(login.user?.organizationId) ||
  normalizeString(login.user?.organization_id);

const getOrganizationIdFromToken = (token: string): string | undefined => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return undefined;
  }

  return normalizeString(payload.organizationId) || normalizeString(payload.organization_id);
};

const loginViaRequest = async (
  apiURL: string,
  request: APIRequestContext
): Promise<{ token: string; organizationId?: string }> => {
  const sharedUser = getSharedTestUser();
  const email = sharedUser.email;
  const password = sharedUser.password;

  const doLogin = async () =>
    request.post(`${apiURL}/api/v2/auth/login`, {
      data: { email, password },
      timeout: 15000,
    });

  let loginResponse = await doLogin();
  if (!loginResponse.ok() && [400, 401, 404].includes(loginResponse.status())) {
    await request
      .post(`${apiURL}/api/v2/auth/register`, {
        data: {
          email,
          password,
          password_confirm: password,
          first_name: 'Test',
          last_name: 'User',
        },
        timeout: 15000,
      })
      .catch(() => undefined);
    loginResponse = await doLogin();
  }

  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = unwrapApiData<LoginResponse>(await loginResponse.json());
  const token = normalizeString(loginBody.token);
  expect(token).toBeTruthy();
  if (!token) {
    throw new Error(`Login response missing token: ${JSON.stringify(loginBody)}`);
  }

  return {
    token,
    organizationId: resolveOrganizationId(loginBody) || getOrganizationIdFromToken(token),
  };
};

test.describe('Ingest Workflows', () => {
  test('preview-text endpoint validates format and accepts CSV preview', async ({ request }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const { token, organizationId } = await loginViaRequest(apiURL, request);

    const csrfResponse = await request.get(`${apiURL}/api/v2/auth/csrf-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      },
      timeout: 15000,
    });
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfBody = await csrfResponse.json();
    const csrfToken = unwrapApiData<{ csrfToken?: string }>(csrfBody)?.csrfToken;
    expect(typeof csrfToken).toBe('string');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': String(csrfToken),
      ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      Cookie: '',
    };

    const postPreview = async (data: { format: string; text: string }) => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          return await request.post(`${apiURL}/api/v2/ingest/preview-text`, {
            headers,
            data,
            timeout: 15000,
          });
        } catch (error) {
          lastError = error;
          if (attempt === 3) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        }
      }
      throw lastError;
    };

    const bad = await postPreview({ format: 'xml', text: '<a />' });
    expect(bad.status()).toBe(400);

    const ok = await postPreview({ format: 'csv', text: 'name,amount\nA,10' });
    expect(ok.ok()).toBeTruthy();
  });
});
