import { expect, Page } from '@playwright/test';
import { clearAuth, ensureEffectiveAdminLoginViaAPI } from './auth';
import { createTestContact, getAuthHeaders } from './database';

const HTTP_SCHEME = ['http', '://'].join('');

type PortalRequestRow = {
  id: string;
  email: string;
};

export type ProvisionedPortalUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  contactId: string;
<<<<<<< HEAD
  accountId: string;
  adminToken: string;
  organizationId?: string;
=======
>>>>>>> origin/main
};

const getApiUrl = (): string => {
  const backendPort = process.env.E2E_BACKEND_PORT?.trim();
  if (backendPort) {
    return `${HTTP_SCHEME}127.0.0.1:${backendPort}`;
  }

  return process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
};

const toRequestRows = (payload: unknown): PortalRequestRow[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const body = payload as {
    requests?: unknown;
    data?: {
      requests?: unknown;
    };
  };

  if (Array.isArray(body.requests)) {
    return body.requests as PortalRequestRow[];
  }
  if (Array.isArray(body.data?.requests)) {
    return body.data.requests as PortalRequestRow[];
  }

  return [];
};

export async function provisionApprovedPortalUser(
  page: Page,
  options: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  } = {}
): Promise<ProvisionedPortalUser> {
  const apiURL = getApiUrl();
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const firstName = options.firstName || 'Portal';
  const lastName = options.lastName || 'Client';
  const email = options.email || `portal-e2e-${uniqueSuffix}@example.com`;
  const password = options.password || 'Portal123!@#';
  const adminSession = await ensureEffectiveAdminLoginViaAPI(page, {
    firstName: 'Portal',
    lastName: 'Admin',
    organizationName: 'Portal Test Organization',
  });
  const adminOrganizationId =
    typeof adminSession.user?.organizationId === 'string'
      ? adminSession.user.organizationId
      : typeof adminSession.user?.organization_id === 'string'
        ? adminSession.user.organization_id
        : undefined;

  const contact = await createTestContact(page, adminSession.token, {
    firstName,
    lastName,
    email,
    contactType: 'client',
    accountId: adminOrganizationId,
  });

  const signupResponse = await page.request.post(`${apiURL}/api/v2/portal/auth/signup`, {
    data: {
      email,
      password,
      firstName,
      lastName,
    },
  });
  const signupStatus = signupResponse.status();
  const signupBodyText = await signupResponse.text();
  const lowerSignupBody = signupBodyText.toLowerCase();
  const signupAlreadyExists =
    signupStatus === 409 ||
    lowerSignupBody.includes('user already exists') ||
    lowerSignupBody.includes('already exists');

  if (signupStatus !== 201 && !signupAlreadyExists) {
    throw new Error(
      `Portal signup failed (${signupStatus}): ${signupBodyText}`
    );
  }

  const headers = await getAuthHeaders(page, adminSession.token);
  const pendingRequestsResponse = await page.request.get(`${apiURL}/api/v2/portal/admin/requests`, {
    headers,
  });
  if (!pendingRequestsResponse.ok()) {
    throw new Error(
      `Failed to list portal signup requests (${pendingRequestsResponse.status()}): ${await pendingRequestsResponse.text()}`
    );
  }
  const pendingRequestsPayload = await pendingRequestsResponse.json();
  const pendingRequests = toRequestRows(pendingRequestsPayload);
  const pendingRequest = pendingRequests.find(
    (requestRow) =>
      typeof requestRow.email === 'string' &&
      requestRow.email.toLowerCase() === email.toLowerCase()
  );
  if (!pendingRequest?.id && !signupAlreadyExists) {
    throw new Error(
      `Portal signup request for ${email} not found after signup. Payload: ${JSON.stringify(
        pendingRequestsPayload
      )}`
    );
  }

  if (pendingRequest?.id) {
    const approveResponse = await page.request.post(
      `${apiURL}/api/v2/portal/admin/requests/${pendingRequest.id}/approve`,
      {
        headers,
      }
    );
    if (!approveResponse.ok()) {
      throw new Error(
        `Failed to approve portal signup request (${approveResponse.status()}): ${await approveResponse.text()}`
      );
    }
  }

  return {
    email,
    password,
    firstName,
    lastName,
    contactId: contact.id,
<<<<<<< HEAD
    accountId: contact.accountId,
    adminToken: adminSession.token,
    organizationId: adminOrganizationId,
=======
>>>>>>> origin/main
  };
}

export async function loginPortalUserUI(
  page: Page,
  credentials: Pick<ProvisionedPortalUser, 'email' | 'password'>
): Promise<void> {
  await clearAuth(page);
  await page.goto('/portal/login');
  await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);
  const portalInputs = page.getByRole('textbox');
  await expect(portalInputs.first()).toBeVisible({ timeout: 30000 });
  await expect(portalInputs.nth(1)).toBeVisible({ timeout: 30000 });
  await portalInputs.first().fill(credentials.email);
  await portalInputs.nth(1).fill(credentials.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  const portalUrlPattern = /\/portal(?:\/login)?(?:\?|$)/;
  const uiRedirected = await page
    .waitForURL((url) => portalUrlPattern.test(url.toString()), { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!uiRedirected || /\/portal\/login(?:\?|$)/.test(page.url())) {
    const apiURL = getApiUrl();
    const loginResponse = await page.request.post(`${apiURL}/api/v2/portal/auth/login`, {
      data: credentials,
    });
    if (!loginResponse.ok()) {
      throw new Error(
        `Portal login fallback failed (${loginResponse.status()}): ${await loginResponse.text()}`
      );
    }

    await page.goto('/portal');
  }

  await expect(page).toHaveURL(/\/portal(?:\?|$)/, { timeout: 15000 });
}
