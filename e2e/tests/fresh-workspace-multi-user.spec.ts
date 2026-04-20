import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  assertMfaEnforcedExternalRuntime,
  expectPasswordLoginToRequireMfaEnrollmentViaAPI,
  loginViaAPI,
  loginWithSeededTotpViaAPI,
  setupFreshAdminSessionViaAPI,
} from '../helpers/auth';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { getAuthHeaders } from '../helpers/database';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

test.describe.configure({ timeout: 300_000 });

type UserCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
};

type LoggedInContext = {
  context: BrowserContext;
  page: Page;
  token: string;
};

type ManagedUser = {
  id: string;
  email: string;
  role: string;
};

type PersonaProbeExpectation = {
  expectedUsersStatus: 200 | 403;
  canCreateSavedReport: boolean;
};

const uniqueRunId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const extractEntityId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as {
    id?: unknown;
    data?: { id?: unknown };
    saved_report_id?: unknown;
  };
  const candidate = body.id || body.saved_report_id || body.data?.id;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
};

async function createManagedUser(
  page: Page,
  adminToken: string,
  profile: Required<Pick<UserCredentials, 'email' | 'password' | 'firstName' | 'lastName' | 'role'>>
): Promise<ManagedUser> {
  const headers = await getAuthHeaders(page, adminToken);
  const response = await page.request.post(`${API_URL}/api/v2/users`, {
    headers,
    data: {
      email: profile.email,
      password: profile.password,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
    },
  });

  if (!response.ok()) {
    if (response.status() === 409) {
      const lookupResponse = await page.request.get(
        `${API_URL}/api/v2/users?search=${encodeURIComponent(profile.email)}`,
        { headers }
      );

      if (!lookupResponse.ok()) {
        throw new Error(
          `Failed to fetch existing user ${profile.email} after conflict (${lookupResponse.status()}): ${await lookupResponse.text()}`
        );
      }

      const lookupPayload = unwrapSuccess<{ users?: Array<{ id?: string; email?: string; role?: string }> }>(
        await lookupResponse.json()
      );
      const existingUser =
        lookupPayload.users?.find(
          (user) =>
            typeof user.email === 'string' && user.email.toLowerCase() === profile.email.toLowerCase()
        ) || lookupPayload.users?.[0];

      if (!existingUser?.id) {
        throw new Error(
          `Existing user lookup missing id for ${profile.email}: ${JSON.stringify(lookupPayload)}`
        );
      }

      return {
        id: existingUser.id,
        email: existingUser.email || profile.email,
        role: existingUser.role || profile.role,
      };
    }

    throw new Error(`Failed to create user ${profile.email} (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{ id?: string; email?: string; role?: string }>(await response.json());
  const id = payload.id;
  if (!id) {
    throw new Error(`User creation response missing id for ${profile.email}: ${JSON.stringify(payload)}`);
  }

  return {
    id,
    email: payload.email || profile.email,
    role: payload.role || profile.role,
  };
}

async function loginIsolatedContext(
  browser: Browser,
  credentials: UserCredentials
): Promise<LoggedInContext> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const session = await loginViaAPI(page, credentials.email, credentials.password);

  return {
    context,
    page,
    token: session.token,
  };
}

async function loginManagerWithSeededTotpContext(
  browser: Browser,
  credentials: UserCredentials,
  userId: string
): Promise<LoggedInContext> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const session = await loginWithSeededTotpViaAPI(
    page,
    {
      email: credentials.email,
      password: credentials.password,
      userId,
    },
    {
      proofName: `Fresh-workspace manager MFA proof for ${credentials.email}`,
    }
  );

  return {
    context,
    page,
    token: session.token,
  };
}

async function assertCanonicalPersonaApiSurface(
  page: Page,
  token: string,
  persona: string,
  userSearchEmail: string,
  expectation: PersonaProbeExpectation
): Promise<void> {
  const headers = await getAuthHeaders(page, token);

  const templatesResponse = await page.request.get(`${API_URL}/api/v2/reports/templates`, {
    headers,
  });
  expect(templatesResponse.status(), `${persona} should reach /api/v2/reports/templates`).toBe(200);

  const savedReportsListResponse = await page.request.get(`${API_URL}/api/v2/saved-reports?limit=10`, {
    headers,
  });
  expect(savedReportsListResponse.status(), `${persona} should reach /api/v2/saved-reports`).toBe(200);

  const usersResponse = await page.request.get(
    `${API_URL}/api/v2/users?search=${encodeURIComponent(userSearchEmail)}`,
    { headers }
  );
  expect(usersResponse.status(), `${persona} canonical /api/v2/users access`).toBe(
    expectation.expectedUsersStatus
  );

  if (expectation.expectedUsersStatus === 200) {
    const usersPayload = unwrapSuccess<{ users?: Array<{ email?: string }> }>(await usersResponse.json());
    const matchedUser = usersPayload.users?.find(
      (user) => typeof user.email === 'string' && user.email.toLowerCase() === userSearchEmail.toLowerCase()
    );
    expect(matchedUser, `${persona} should find ${userSearchEmail} via /api/v2/users`).toBeTruthy();
  }

  let createdSavedReportId: string | null = null;
  try {
    const createSavedReportResponse = await page.request.post(`${API_URL}/api/v2/saved-reports`, {
      headers,
      data: {
        name: `${persona} Persona Report ${uniqueRunId()}`,
        entity: 'opportunities',
        report_definition: {
          name: `${persona} Persona Report`,
          entity: 'opportunities',
          fields: ['stage_name', 'weighted_amount'],
          filters: [],
          sort: [],
        },
      },
    });

    if (expectation.canCreateSavedReport) {
      expect(
        createSavedReportResponse.status(),
        `${persona} saved-report create should stay on the canonical /api/v2/saved-reports contract`
      ).toBe(201);
      createdSavedReportId = extractEntityId(await createSavedReportResponse.json());
      expect(createdSavedReportId, `${persona} saved-report create response id`).toBeTruthy();
    } else {
      expect(
        createSavedReportResponse.status(),
        `${persona} should be denied report creation on /api/v2/saved-reports`
      ).toBe(403);
    }
  } finally {
    if (createdSavedReportId) {
      await page.request
        .delete(`${API_URL}/api/v2/saved-reports/${createdSavedReportId}`, { headers })
        .catch(() => undefined);
    }
  }
}

test.describe('Fresh workspace multi-user session', () => {
  test('boots a fresh workspace and proves MFA-aware persona auth on canonical API surfaces', async ({
    browser,
  }) => {
    assertMfaEnforcedExternalRuntime('Fresh workspace persona auth proof');

    const runId = uniqueRunId();
    const admin: UserCredentials = {
      email: `qa-admin.${runId}@example.com`,
      password: 'QaAdmin123!',
      firstName: 'QA',
      lastName: 'Admin',
      role: 'admin',
    };
    const manager: UserCredentials = {
      email: `qa-manager.${runId}@example.com`,
      password: 'QaManager123!',
      firstName: 'QA',
      lastName: 'Manager',
      role: 'manager',
    };
    const staff: UserCredentials = {
      email: `qa-staff.${runId}@example.com`,
      password: 'QaStaff123!',
      firstName: 'QA',
      lastName: 'Staff',
      role: 'staff',
    };
    const viewer: UserCredentials = {
      email: `qa-viewer.${runId}@example.com`,
      password: 'QaViewer123!',
      firstName: 'QA',
      lastName: 'Viewer',
      role: 'viewer',
    };

    const setupContext = await browser.newContext({ baseURL: BASE_URL });
    const setupPage = await setupContext.newPage();
    const contextsToClose: BrowserContext[] = [setupContext];

    try {
      const adminSession = await setupFreshAdminSessionViaAPI(setupPage, {
        email: admin.email,
        password: admin.password,
        firstName: admin.firstName,
        lastName: admin.lastName,
        organizationName: `QA Fresh Workspace ${runId}`,
      });

      const adminPasswordCheckContext = await browser.newContext({ baseURL: BASE_URL });
      const adminPasswordCheckPage = await adminPasswordCheckContext.newPage();
      contextsToClose.push(adminPasswordCheckContext);
      await expectPasswordLoginToRequireMfaEnrollmentViaAPI(
        adminPasswordCheckPage,
        admin.email,
        admin.password
      );

      const managerUser = await createManagedUser(setupPage, adminSession.token, manager);
      await createManagedUser(setupPage, adminSession.token, staff);
      await createManagedUser(setupPage, adminSession.token, viewer);

      const managerSession = await loginManagerWithSeededTotpContext(browser, manager, managerUser.id);
      const staffSession = await loginIsolatedContext(browser, staff);
      const viewerSession = await loginIsolatedContext(browser, viewer);
      contextsToClose.push(
        managerSession.context,
        staffSession.context,
        viewerSession.context
      );

      await Promise.all([
        assertCanonicalPersonaApiSurface(setupPage, adminSession.token, 'admin', manager.email, {
          expectedUsersStatus: 200,
          canCreateSavedReport: true,
        }),
        assertCanonicalPersonaApiSurface(managerSession.page, managerSession.token, 'manager', manager.email, {
          expectedUsersStatus: 403,
          canCreateSavedReport: true,
        }),
        assertCanonicalPersonaApiSurface(staffSession.page, staffSession.token, 'staff', manager.email, {
          expectedUsersStatus: 403,
          canCreateSavedReport: false,
        }),
        assertCanonicalPersonaApiSurface(viewerSession.page, viewerSession.token, 'viewer', manager.email, {
          expectedUsersStatus: 403,
          canCreateSavedReport: false,
        }),
      ]);
    } finally {
      for (const context of contextsToClose.reverse()) {
        await context.close().catch(() => undefined);
      }
    }
  });
});
