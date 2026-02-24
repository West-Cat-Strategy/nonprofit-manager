import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureAdminLoginViaAPI } from '../helpers/auth';
import { createTestContact, getAuthHeaders } from '../helpers/database';

type SuccessEnvelope<T> = {
  success?: boolean;
  data?: T;
};

const unwrap = <T>(payload: SuccessEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as SuccessEnvelope<T>).data as T;
  }
  return payload as T;
};

const toBase64Url = (value: string): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const signJwtHs256 = (payload: Record<string, unknown>, secret: string): string => {
  const encodedHeader = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${body}.${signature}`;
};

const parseJwtSecretFromEnvFile = (filePath: string): string | null => {
  try {
    const file = fs.readFileSync(filePath, 'utf8');
    const match = file.match(/^JWT_SECRET=(.+)$/m);
    if (!match || !match[1]) {
      return null;
    }
    return match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return null;
  }
};

const resolveJwtSecret = (): string | null => {
  if (process.env.JWT_SECRET?.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  const envTestSecret = parseJwtSecretFromEnvFile(
    path.resolve(__dirname, '..', '..', 'backend', '.env.test')
  );
  if (envTestSecret) {
    process.env.JWT_SECRET = envTestSecret;
    return envTestSecret;
  }

  const envSecret = parseJwtSecretFromEnvFile(
    path.resolve(__dirname, '..', '..', 'backend', '.env')
  );
  if (envSecret) {
    process.env.JWT_SECRET = envSecret;
    return envSecret;
  }

  return null;
};

const decodeJwtRole = (token: string): string | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
};

type AuthLoginPayload = {
  token: string;
  user?: {
    id?: string;
    role?: string;
  };
};

const tryLoginAsAdmin = async (
  page: import('@playwright/test').Page,
  apiURL: string,
  email: string,
  passwords: string[]
): Promise<AuthLoginPayload | null> => {
  for (const password of passwords) {
    const response = await page.request.post(`${apiURL}/api/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      continue;
    }

    const payload = unwrap<AuthLoginPayload>(await response.json());
    if (payload.user?.role?.toLowerCase() === 'admin') {
      return payload;
    }
  }

  return null;
};

test.use({ baseURL: 'http://127.0.0.1:5173' });

test.describe('Portal Cases Visibility', () => {
  test('staff-shared case exposes only client-visible notes in portal', async ({ page }) => {
    const apiURL = 'http://127.0.0.1:3001';
    const frontendURL = 'http://127.0.0.1:5173';
    process.env.API_URL = apiURL;
    process.env.BASE_URL = frontendURL;
    const adminSession = await ensureAdminLoginViaAPI(page, {
      firstName: 'Portal',
      lastName: 'Staff',
      organizationName: 'Portal Visibility Org',
    });

    let effectiveAdminToken = adminSession.token;
    let effectiveAdminUserId = adminSession.user?.id;
    let hasAdminRole = adminSession.isAdmin;

    if (!hasAdminRole) {
      const adminEmail = process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com';
      const credentialCandidates = [
        process.env.ADMIN_USER_PASSWORD?.trim() || '',
        'Admin123!@',
        'Admin123!@#',
        'Admin123!@#$',
      ].filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);

      const adminLoginPayload = await tryLoginAsAdmin(page, apiURL, adminEmail, credentialCandidates);
      if (adminLoginPayload?.token) {
        effectiveAdminToken = adminLoginPayload.token;
        effectiveAdminUserId = adminLoginPayload.user?.id;
        hasAdminRole = true;
      }
    }

    if (!hasAdminRole) {
      if (!effectiveAdminUserId) {
        throw new Error('Admin bootstrap user id is required for portal approval flow');
      }

      effectiveAdminToken = (() => {
          const jwtSecret = resolveJwtSecret();
          if (!jwtSecret) {
            throw new Error(
              'JWT_SECRET is required to elevate fallback admin session for portal approval flow'
            );
          }

          return signJwtHs256(
            {
              id: String(effectiveAdminUserId),
              email: adminSession.email,
              role: 'admin',
            },
            jwtSecret
          );
        })();
    }
    expect(
      decodeJwtRole(effectiveAdminToken),
      'Expected effective admin token to have role=admin for portal admin endpoints'
    ).toBe('admin');

    await page.context().clearCookies();
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const portalEmail = `portal-case-${unique}@example.com`;
    const portalPassword = 'Portal123!@#';
    const caseTitle = `Case Visibility ${unique}`;
    const visibleNote = `Visible portal note ${unique}`;
    const hiddenNote = `Internal-only note ${unique}`;

    const contact = await createTestContact(page, effectiveAdminToken, {
      firstName: 'Portal',
      lastName: 'Client',
      email: portalEmail,
      contactType: 'client',
    });

    const authHeaders = await getAuthHeaders(page, effectiveAdminToken);

    const caseTypesResponse = await page.request.get(`${apiURL}/api/v2/cases/types`, {
      headers: { Authorization: `Bearer ${effectiveAdminToken}` },
    });
    expect(caseTypesResponse.ok()).toBeTruthy();
    const caseTypes = unwrap<Array<{ id: string }>>(await caseTypesResponse.json());
    expect(caseTypes.length).toBeGreaterThan(0);

    const createCaseResponse = await page.request.post(`${apiURL}/api/v2/cases`, {
      headers: authHeaders,
      data: {
        contact_id: contact.id,
        case_type_id: caseTypes[0].id,
        title: caseTitle,
        description: 'Portal visibility regression test',
        client_viewable: false,
      },
    });
    expect(createCaseResponse.ok()).toBeTruthy();
    const createdCase = unwrap<{ id: string }>(await createCaseResponse.json());
    expect(createdCase.id).toBeTruthy();

    const createVisibleNoteResponse = await page.request.post(`${apiURL}/api/v2/cases/notes`, {
      headers: authHeaders,
      data: {
        case_id: createdCase.id,
        note_type: 'note',
        content: visibleNote,
        visible_to_client: true,
      },
    });
    expect(createVisibleNoteResponse.ok()).toBeTruthy();

    const createHiddenNoteResponse = await page.request.post(`${apiURL}/api/v2/cases/notes`, {
      headers: authHeaders,
      data: {
        case_id: createdCase.id,
        note_type: 'note',
        content: hiddenNote,
        visible_to_client: false,
      },
    });
    expect(createHiddenNoteResponse.ok()).toBeTruthy();

    const shareCaseResponse = await page.request.put(
      `${apiURL}/api/v2/cases/${createdCase.id}/client-viewable`,
      {
        headers: authHeaders,
        data: {
          client_viewable: true,
        },
      }
    );
    expect(shareCaseResponse.ok()).toBeTruthy();

    const signupResponse = await page.request.post(`${apiURL}/api/portal/auth/signup`, {
      data: {
        email: portalEmail,
        password: portalPassword,
        firstName: 'Portal',
        lastName: 'Client',
      },
    });
    expect(signupResponse.status()).toBe(201);

    const pendingRequestsResponse = await page.request.get(`${apiURL}/api/portal/admin/requests`, {
      headers: { Authorization: `Bearer ${effectiveAdminToken}` },
    });
    const pendingRequestsStatus = pendingRequestsResponse.status();
    const pendingRequestsBodyText = await pendingRequestsResponse.text();
    expect(
      pendingRequestsResponse.ok(),
      `Expected portal admin requests call to succeed, got ${pendingRequestsStatus}: ${pendingRequestsBodyText}`
    ).toBeTruthy();
    const pendingRequests = JSON.parse(pendingRequestsBodyText) as {
      requests?: Array<{ id: string; email: string }>;
    };
    const pendingRequest = pendingRequests.requests?.find(
      (requestRow) => requestRow.email.toLowerCase() === portalEmail.toLowerCase()
    );
    expect(pendingRequest).toBeTruthy();

    const approveRequestResponse = await page.request.post(
      `${apiURL}/api/portal/admin/requests/${pendingRequest!.id}/approve`,
      {
        headers: authHeaders,
      }
    );
    expect(approveRequestResponse.ok()).toBeTruthy();

    await page.context().clearCookies();
    await page.goto(frontendURL);
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('organizationId');
      localStorage.removeItem('user');
    });

    await page.goto(`${frontendURL}/portal/login`);
    await page.fill('input[type="email"]', portalEmail);
    await page.fill('input[type="password"]', portalPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal$/);

    await page.goto(`${frontendURL}/portal/cases`);
    await expect(page.getByRole('heading', { name: /my cases/i })).toBeVisible();
    await expect(page.getByText(caseTitle)).toBeVisible();

    await page.getByRole('link', { name: new RegExp(caseTitle) }).click();
    await expect(page).toHaveURL(new RegExp(`/portal/cases/${createdCase.id}`));

    await expect(page.getByText(visibleNote)).toBeVisible();
    await expect(page.getByText(hiddenNote)).toHaveCount(0);
  });
});
