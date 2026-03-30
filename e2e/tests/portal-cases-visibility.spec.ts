import { test, expect } from '@playwright/test';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { createTestContact, getAuthHeaders } from '../helpers/database';
import { API_URL, BASE_URL } from '../helpers/testEnv';

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

test.use({ baseURL: BASE_URL });

test.describe('Portal Cases Visibility', () => {
  test('staff-shared case exposes only client-visible notes in portal', async ({ page }) => {
    const apiURL = API_URL;
    const frontendURL = BASE_URL;
    const adminSession = await ensureEffectiveAdminLoginViaAPI(page, {
      firstName: 'Portal',
      lastName: 'Staff',
      organizationName: 'Portal Visibility Org',
    });
    expect(adminSession.isAdmin).toBeTruthy();
    const effectiveAdminToken = adminSession.token;
    const organizationId =
      typeof adminSession.user?.organizationId === 'string'
        ? adminSession.user.organizationId
        : typeof adminSession.user?.organization_id === 'string'
          ? adminSession.user.organization_id
          : undefined;

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
      accountId: organizationId,
    });

    const authHeaders = await getAuthHeaders(page, effectiveAdminToken);

    const caseTypesResponse = await page.request.get(`${apiURL}/api/v2/cases/types`, {
      headers: authHeaders,
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

    const signupResponse = await page.request.post(`${apiURL}/api/v2/portal/auth/signup`, {
      data: {
        email: portalEmail,
        password: portalPassword,
        firstName: 'Portal',
        lastName: 'Client',
      },
    });
    expect(signupResponse.status()).toBe(201);

    const pendingRequestsResponse = await page.request.get(`${apiURL}/api/v2/portal/admin/requests`, {
      headers: authHeaders,
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
      `${apiURL}/api/v2/portal/admin/requests/${pendingRequest!.id}/approve`,
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
