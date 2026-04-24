import { test, expect, type Page } from '@playwright/test';
import {
  ensureEffectiveAdminLoginViaAPI,
  loginViaAPI,
  loginWithSeededTotpViaAPI,
  setupFreshAdminSessionViaAPI,
} from '../helpers/auth';
import {
  createTestContact,
  getAuthHeaders,
  resolveAuthenticatedFixtureScope,
} from '../helpers/database';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { personaWorkflowMatrix } from '../../frontend/src/test/ux/personaWorkflowMatrix';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const MFA_BYPASS_ENABLED = process.env.BYPASS_MFA_FOR_TESTS?.trim().toLowerCase() === 'true';
const USE_EXTERNAL_RUNTIME_MFA_PROOF =
  process.env.SKIP_WEBSERVER === '1' && !MFA_BYPASS_ENABLED;

type ManagedRole = 'manager' | 'staff' | 'viewer';

type ManagedUserProfile = {
  id: string;
  email: string;
  password: string;
  role: ManagedRole;
};

const uniqueRunId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let personaAdminProfile = {
  email: `persona-admin.${uniqueRunId()}@example.com`,
  password: 'PersonaAdmin123!',
  firstName: 'Persona',
  lastName: 'Admin',
  organizationName: `Persona Workflow Org ${uniqueRunId()}`,
};

const buildManagedUserProfile = (
  role: ManagedRole,
  label: string
): Omit<ManagedUserProfile, 'id'> => ({
  email: `${label}.${role}.${uniqueRunId()}@example.com`,
  password: `${label.slice(0, 1).toUpperCase()}${label.slice(1)}123!`,
  role,
});

async function createManagedUser(
  page: Page,
  adminToken: string,
  profile: Omit<ManagedUserProfile, 'id'>
): Promise<ManagedUserProfile> {
  const headers = await getAuthHeaders(page, adminToken);
  const response = await page.request.post(`${API_URL}/api/v2/users`, {
    headers,
    data: {
      email: profile.email,
      password: profile.password,
      firstName: 'Persona',
      lastName: profile.role,
      role: profile.role,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create ${profile.role} user ${profile.email} (${response.status()}): ${await response.text()}`
    );
  }

  const payload = unwrapSuccess<{ id?: string; email?: string; role?: string }>(await response.json());
  if (!payload.id) {
    throw new Error(`User creation response missing id for ${profile.email}: ${JSON.stringify(payload)}`);
  }

  return {
    ...profile,
    id: payload.id,
    email: payload.email || profile.email,
    role: (payload.role as ManagedRole | undefined) || profile.role,
  };
}

async function loginManagedUser(
  page: Page,
  user: ManagedUserProfile
): Promise<{ token: string }> {
  // The host harness always starts the backend with MFA bypass enabled. Only
  // externally managed runtimes with bypass explicitly disabled can prove the
  // manager TOTP challenge.
  if (user.role === 'manager' && USE_EXTERNAL_RUNTIME_MFA_PROOF) {
    return loginWithSeededTotpViaAPI(
      page,
      {
        email: user.email,
        password: user.password,
        userId: user.id,
      },
      {
        proofName: `Persona workflow manager login for ${user.email}`,
      }
    );
  }

  return loginViaAPI(page, user.email, user.password);
}

let personaAdminUserId: string | null = null;
let personaWorkspaceBootstrapped = false;

async function ensurePersonaAdminSession(page: Page, proofName: string) {
  if (!personaWorkspaceBootstrapped) {
    let session;
    try {
      session = await setupFreshAdminSessionViaAPI(page, personaAdminProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const starterOnlyUnavailable = message.includes('starter-only workspace');

      if (!starterOnlyUnavailable) {
        throw error;
      }

      try {
        session = await ensureEffectiveAdminLoginViaAPI(page, {
          firstName: personaAdminProfile.firstName,
          lastName: personaAdminProfile.lastName,
          organizationName: personaAdminProfile.organizationName,
        });
        personaAdminProfile = {
          ...personaAdminProfile,
          email: session.email,
          password: session.password,
        };
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(
          `${message} Existing-runtime admin login also failed: ${fallbackMessage}. Set ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD in e2e/.env.test.local when the host runtime was provisioned with non-default admin credentials.`
        );
      }
    }

    const resolvedUserId =
      typeof session.user?.id === 'string'
        ? session.user.id
        : typeof session.user?.sub === 'string'
          ? session.user.sub
          : null;

    if (!resolvedUserId) {
      throw new Error(`Persona admin bootstrap missing user id: ${JSON.stringify(session.user)}`);
    }

    personaAdminUserId = resolvedUserId;
    personaWorkspaceBootstrapped = true;
    return session;
  }

  if (!personaAdminUserId) {
    throw new Error('Persona workspace bootstrap completed without a reusable admin user id');
  }

  if (USE_EXTERNAL_RUNTIME_MFA_PROOF) {
    return loginWithSeededTotpViaAPI(
      page,
      {
        email: personaAdminProfile.email,
        password: personaAdminProfile.password,
        userId: personaAdminUserId,
      },
      { proofName }
    );
  }

  const session = await ensureEffectiveAdminLoginViaAPI(page, {
    firstName: personaAdminProfile.firstName,
    lastName: personaAdminProfile.lastName,
    organizationName: personaAdminProfile.organizationName,
  });
  personaAdminProfile = {
    ...personaAdminProfile,
    email: session.email,
    password: session.password,
  };
  return session;
}

async function getFirstCaseTypeId(page: Page, token: string): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.get(`${API_URL}/api/v2/cases/types`, { headers });
  if (!response.ok()) {
    throw new Error(`Failed to fetch case types (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<
    Array<{ id?: string; case_type_id?: string }> | { data?: Array<{ id?: string; case_type_id?: string }> }
  >(await response.json());
  const entries = Array.isArray(payload) ? payload : payload?.data || [];
  const firstTypeId = entries.find((entry) => entry.id || entry.case_type_id);
  const caseTypeId = firstTypeId?.id || firstTypeId?.case_type_id;

  if (!caseTypeId) {
    throw new Error(`No case types available: ${JSON.stringify(payload)}`);
  }

  return caseTypeId;
}

async function waitForCaseReadability(page: Page, token: string, caseId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const headers = await getAuthHeaders(page, token);
        const response = await page.request.get(`${API_URL}/api/v2/cases/${caseId}`, { headers });
        return response.ok();
      },
      { timeout: 15000, intervals: [500, 1000, 1500] }
    )
    .toBe(true);
}

async function createCaseRecord(
  page: Page,
  token: string,
  input: {
    title: string;
    description: string;
    referralSource?: string;
    clientViewable?: boolean;
  }
): Promise<{ id: string }> {
  const fixtureScope = await resolveAuthenticatedFixtureScope(page, token);
  const accountId = fixtureScope.accountId || fixtureScope.organizationId;
  if (!accountId) {
    throw new Error('Unable to resolve organization context for persona case fixture');
  }

  const contact = await createTestContact(page, token, {
    firstName: 'Persona',
    lastName: `Case ${uniqueRunId()}`,
    email: `persona.case.${uniqueRunId()}@example.com`,
    contactType: 'client',
    accountId,
  });
  const caseTypeId = await getFirstCaseTypeId(page, token);
  const headers = await getAuthHeaders(page, token);

  const response = await page.request.post(`${API_URL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: contact.id,
      account_id: contact.accountId,
      case_type_id: caseTypeId,
      title: input.title,
      description: input.description,
      priority: 'medium',
      is_urgent: false,
      referral_source: input.referralSource,
      client_viewable: input.clientViewable ?? false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create persona case (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
  const caseId = payload.id || payload.data?.id;
  if (!caseId) {
    throw new Error(`Case creation response missing id: ${JSON.stringify(payload)}`);
  }

  await waitForCaseReadability(page, token, caseId);
  return { id: caseId };
}

test.describe('Persona workflow routes', () => {
  test.describe.configure({ mode: 'serial' });

  test(`${personaWorkflowMatrix['executive-director'].workflowIds[0]} keeps executive oversight cues aligned`, async ({
    page,
  }) => {
    const persona = personaWorkflowMatrix['executive-director'];

    await ensurePersonaAdminSession(page, 'Persona workflow executive admin login');

    await page.goto(persona.anchorRouteSequence[0], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^workbench$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /focus queue/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[1], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /reports home/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /executive \+ board pack/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /board pack templates/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[2], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /saved reports/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[3], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /scheduled reports/i })).toBeVisible();
  });

  test(`${personaWorkflowMatrix.fundraiser.workflowIds[0]} keeps fundraising handoffs visible`, async ({
    page,
  }) => {
    const persona = personaWorkflowMatrix.fundraiser;
    const adminSession = await ensurePersonaAdminSession(
      page,
      'Persona workflow fundraiser admin login'
    );
    const fundraiserUser = await createManagedUser(
      page,
      adminSession.token,
      buildManagedUserProfile('manager', 'fundraiser')
    );
    await loginManagedUser(page, fundraiserUser);

    await page.goto(persona.anchorRouteSequence[0], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /people/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /search contacts/i })).toBeVisible();

    await page.goto(`${persona.anchorRouteSequence[1]}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: /opportunities/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /reports workspace/i })).toBeVisible();

    await page.goto(`${persona.anchorRouteSequence[2]}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: /^donations$/i })).toBeVisible();
    await page.getByRole('link', { name: /reports workspace/i }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: /fundraising cadence/i })).toBeVisible();
  });

  test(`${personaWorkflowMatrix['nonprofit-administrator'].workflowIds[0]} keeps admin continuity routes aligned`, async ({
    page,
  }) => {
    const persona = personaWorkflowMatrix['nonprofit-administrator'];

    await ensurePersonaAdminSession(page, 'Persona workflow nonprofit administrator login');

    await page.goto(persona.anchorRouteSequence[0], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin hub/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[1], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^navigation$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reset to defaults/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[2], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /newsletter campaigns/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /newsletter provider not configured/i })
    ).toBeVisible();

    await page.goto(persona.anchorRouteSequence[3], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /scheduled reports/i })).toBeVisible();
  });

  test(`${personaWorkflowMatrix['board-member'].workflowIds[0]} keeps board users on a read-only reports path`, async ({
    page,
  }) => {
    const persona = personaWorkflowMatrix['board-member'];
    const adminSession = await ensurePersonaAdminSession(
      page,
      'Persona workflow board admin login'
    );
    const boardUser = await createManagedUser(
      page,
      adminSession.token,
      buildManagedUserProfile('viewer', 'board')
    );

    await loginManagedUser(page, boardUser);

    await page.goto(persona.anchorRouteSequence[0], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^workbench$/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[1], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /reports home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^saved reports$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^scheduled reports$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /board pack templates/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /open builder/i })).toHaveCount(0);

    await page.goto('/reports/builder', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/reports\/saved$/);
    await expect(page.getByRole('heading', { name: /saved reports/i })).toBeVisible();
    await expect(
      page.getByText(/creating, sharing, and scheduling are limited to report managers/i)
    ).toBeVisible();

    await page.goto(persona.anchorRouteSequence[3], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /scheduled reports/i })).toBeVisible();
    await expect(
      page.getByText(/creating or modifying schedules is limited to report managers/i)
    ).toBeVisible();
  });

  test(`${personaWorkflowMatrix['case-manager'].workflowIds[0]} keeps case continuity cues visible`, async ({
    page,
  }) => {
    const persona = personaWorkflowMatrix['case-manager'];
    const adminSession = await ensurePersonaAdminSession(
      page,
      'Persona workflow case manager admin login'
    );
    const caseManagerUser = await createManagedUser(
      page,
      adminSession.token,
      buildManagedUserProfile('staff', 'case-manager')
    );
    const caseRecord = await createCaseRecord(page, adminSession.token, {
      title: `Case Manager Continuity ${uniqueRunId()}`,
      description: 'Case manager continuity record with portal visibility cues.',
      clientViewable: true,
    });

    await loginManagedUser(page, caseManagerUser);

    await page.goto(persona.anchorRouteSequence[0], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^cases$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new case/i })).toBeVisible();

    await page.goto(`/cases/${caseRecord.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/client viewable/i)).toBeChecked();
    await expect(page.getByRole('tab', { name: /portal/i })).toBeVisible();
    await page.getByRole('tab', { name: /appointments/i }).click();
    await expect(page).toHaveURL(new RegExp(`/cases/${caseRecord.id}\\?tab=appointments$`));

    await page.goto(persona.anchorRouteSequence[3], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /follow-ups/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create follow-up/i })).toBeVisible();
  });

  test(`${personaWorkflowMatrix['rehab-worker'].workflowIds[1]} keeps referral and service-transition cues visible`, async ({
    page,
  }) => {
    const persona = personaWorkflowMatrix['rehab-worker'];
    const adminSession = await ensurePersonaAdminSession(
      page,
      'Persona workflow rehab worker admin login'
    );
    const rehabWorkerUser = await createManagedUser(
      page,
      adminSession.token,
      buildManagedUserProfile('staff', 'rehab')
    );
    const caseRecord = await createCaseRecord(page, adminSession.token, {
      title: `Rehab Transition ${uniqueRunId()}`,
      description: 'Rehab workflow with referral and service transition context.',
      referralSource: 'Vocational Referral Partner',
      clientViewable: true,
    });

    await loginManagedUser(page, rehabWorkerUser);

    await page.goto(persona.anchorRouteSequence[0], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^cases$/i })).toBeVisible();

    await page.goto(`/cases/${caseRecord.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/referral source/i)).toBeVisible();
    await expect(page.getByText(/vocational referral partner/i)).toBeVisible();
    await page.getByRole('tab', { name: /services/i }).click();
    await expect(page).toHaveURL(new RegExp(`/cases/${caseRecord.id}\\?tab=services$`));
    await expect(page.getByRole('tab', { name: /appointments/i })).toBeVisible();

    await page.goto(persona.anchorRouteSequence[2], { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /follow-ups/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create follow-up/i })).toBeVisible();
  });
});
