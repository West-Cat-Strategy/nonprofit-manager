import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { applyAuthTokenState, ensureEffectiveAdminLoginViaAPI, loginViaAPI } from '../helpers/auth';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { createTestAccount, createTestContact, getAuthHeaders } from '../helpers/database';
import { waitForPageReady } from '../helpers/routeHelpers';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const backendRequire = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'package.json'));
const { Client: PgClient } = backendRequire('pg') as {
  Client: new (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) => {
    connect(): Promise<void>;
    end(): Promise<void>;
    query(text: string, values?: unknown[]): Promise<unknown>;
  };
};
const { authenticator } = backendRequire('@otplib/preset-default') as {
  authenticator: {
    options: { step?: number; window?: number };
    generate(secret: string): string;
    generateSecret(): string;
    check(code: string, secret: string): boolean;
    keyuri(email: string, issuer: string, secret: string): string;
  };
};

authenticator.options = {
  step: 30,
  window: 1,
};

test.describe.configure({ timeout: 300_000 });

type UserCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'manager' | 'staff' | 'viewer';
};

type LoggedInContext = {
  context: BrowserContext;
  page: Page;
  token: string;
};

type SeededRecord = {
  anchorAccount: { id: string; name: string };
  contactOne: { id: string; name: string; email: string };
  contactTwo: { id: string; name: string; email: string };
  caseOne: { id: string; title: string };
  caseTwo: { id: string; title: string };
  task: { id: string; subject: string };
  followUp: { id: string; title: string; scheduledDate: string };
};

const uniqueRunId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const tomorrowIsoDate = (daysFromToday: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
};

const fullName = (firstName: string, lastName: string): string => `${firstName} ${lastName}`;

const resolveEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }

    if (envKey.length === 44) {
      return Buffer.from(envKey, 'base64');
    }

    return crypto.scryptSync(envKey, 'nonprofit-manager-salt', 32);
  }

  return crypto.scryptSync('dev-encryption-key', 'dev-salt', 32);
};

const encryptWithAppKey = (plaintext: string): string => {
  if (!plaintext) {
    return plaintext;
  }

  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

const extractAuthTokenFromSetCookie = (setCookieHeader: string | undefined): string | undefined => {
  if (!setCookieHeader) {
    return undefined;
  }

  const match = setCookieHeader.match(/(?:^|[\n,]\s*)auth_token=([^;]+)/i);
  if (!match || !match[1]) {
    return undefined;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : undefined;
};

const getDatabaseConnectionConfig = (): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} => ({
  host: process.env.DB_HOST || process.env.E2E_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.E2E_DB_PORT || '8012'),
  database: process.env.DB_NAME || process.env.E2E_DB_NAME || 'nonprofit_manager_test',
  user: process.env.DB_USER || process.env.E2E_DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.E2E_DB_PASSWORD || 'postgres',
});

async function withDatabaseClient<T>(callback: (client: InstanceType<typeof PgClient>) => Promise<T>): Promise<T> {
  const client = new PgClient(getDatabaseConnectionConfig());
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function clearTotpStateForUser(userId: string): Promise<void> {
  await withDatabaseClient(async (client) => {
    await client.query(
      `UPDATE users
       SET mfa_totp_enabled = FALSE,
           mfa_totp_secret_enc = NULL,
           mfa_totp_pending_secret_enc = NULL,
           mfa_totp_enabled_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  });
}

async function completeSetupFlow(page: Page, admin: UserCredentials): Promise<boolean> {
  await page.goto('/setup', { waitUntil: 'domcontentloaded' });
  const setupHeading = page.getByRole('heading', { name: /build your nonprofit workspace in minutes/i });
  if (!(await setupHeading.isVisible().catch(() => false))) {
    return false;
  }

  await page.getByLabel('First Name').fill(admin.firstName);
  await page.getByLabel('Last Name').fill(admin.lastName);
  await page.getByLabel('Organization Name').fill('QA Fresh Workspace');
  await page.getByLabel('Email Address').fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByLabel('Confirm Password').fill(admin.password);

  await Promise.all([
    page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 60_000 }),
    page.getByRole('button', { name: /create admin account/i }).click(),
  ]);

  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
  return true;
}

const isDuplicateUserError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /user already exists|conflict/i.test(message);
};

async function createManagedUser(
  page: Page,
  adminToken: string,
  profile: Required<Pick<UserCredentials, 'email' | 'password' | 'firstName' | 'lastName' | 'role'>>
): Promise<{ id: string; email: string; role: string }> {
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
        lookupPayload.users?.find((user) => typeof user.email === 'string' && user.email.toLowerCase() === profile.email.toLowerCase()) ||
        lookupPayload.users?.[0];

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

async function getFirstCaseTypeId(page: Page, token: string): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.get(`${API_URL}/api/v2/cases/types`, { headers });
  if (!response.ok()) {
    throw new Error(`Failed to fetch case types (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<Array<{ id?: string }> | { types?: Array<{ id?: string }> }>(
    await response.json()
  );
  const caseTypes = Array.isArray(payload) ? payload : payload.types || [];
  const caseTypeId = caseTypes.find((item) => typeof item.id === 'string' && item.id.length > 0)?.id;
  if (!caseTypeId) {
    throw new Error('No case types available for fresh workspace seeding');
  }

  return caseTypeId;
}

async function createCaseRecord(
  page: Page,
  token: string,
  input: {
    contactId: string;
    accountId: string;
    title: string;
    description: string;
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<{ id: string }> {
  const caseTypeId = await getFirstCaseTypeId(page, token);
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${API_URL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: input.contactId,
      account_id: input.accountId,
      case_type_id: caseTypeId,
      title: input.title,
      description: input.description,
      priority: input.priority || 'medium',
      status: 'open',
      ...(input.assignedTo ? { assigned_to: input.assignedTo } : {}),
      client_viewable: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create case ${input.title} (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
  const id = payload.id || payload.data?.id;
  if (!id) {
    throw new Error(`Case creation response missing id for ${input.title}: ${JSON.stringify(payload)}`);
  }

  const readHeaders = await getAuthHeaders(page, token);
  const deadline = Date.now() + 15_000;
  let lastStatus: number | null = null;
  let lastBody = '';
  while (Date.now() < deadline) {
    const readResponse = await page.request.get(`${API_URL}/api/v2/cases/${id}`, { headers: readHeaders });
    lastStatus = readResponse.status();
    lastBody = await readResponse.text().catch(() => '');
    if (readResponse.ok()) {
      break;
    }
    await page.waitForTimeout(750);
  }

  if (lastStatus !== 200) {
    throw new Error(
      `Case ${input.title} was not readable after waiting for availability (lastStatus=${lastStatus ?? 'unknown'}, lastBody=${lastBody || 'empty response'})`
    );
  }

  return { id };
}

async function createTaskRecord(
  page: Page,
  token: string,
  input: {
    subject: string;
    description: string;
    assignedTo?: string;
    relatedToType?: 'account' | 'contact' | 'event' | 'donation' | 'volunteer';
    relatedToId?: string;
  }
): Promise<{ id: string }> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${API_URL}/api/v2/tasks`, {
    headers,
    data: {
      subject: input.subject,
      description: input.description,
      status: 'not_started',
      priority: 'normal',
      ...(input.assignedTo ? { assigned_to: input.assignedTo } : {}),
      ...(input.relatedToType ? { related_to_type: input.relatedToType } : {}),
      ...(input.relatedToId ? { related_to_id: input.relatedToId } : {}),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create task ${input.subject} (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
  const id = payload.id || payload.data?.id;
  if (!id) {
    throw new Error(`Task creation response missing id for ${input.subject}: ${JSON.stringify(payload)}`);
  }

  return { id };
}

async function createFollowUpRecord(
  page: Page,
  token: string,
  input: {
    entityType: 'case' | 'task' | 'contact';
    entityId: string;
    title: string;
    description: string;
    assignedTo?: string;
    scheduledDate: string;
    scheduledTime?: string;
  }
): Promise<{ id: string }> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${API_URL}/api/v2/follow-ups`, {
    headers,
    data: {
      entity_type: input.entityType,
      entity_id: input.entityId,
      title: input.title,
      description: input.description,
      scheduled_date: input.scheduledDate,
      ...(input.scheduledTime ? { scheduled_time: input.scheduledTime } : {}),
      frequency: 'once',
      method: 'phone',
      ...(input.assignedTo ? { assigned_to: input.assignedTo } : {}),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create follow-up ${input.title} (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
  const id = payload.id || payload.data?.id;
  if (!id) {
    throw new Error(`Follow-up creation response missing id for ${input.title}: ${JSON.stringify(payload)}`);
  }

  return { id };
}

async function loginIsolatedContext(browser: Browser, credentials: UserCredentials): Promise<LoggedInContext> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const session = await loginViaAPI(page, credentials.email, credentials.password);
  await applyAuthTokenState(page, session.token, session.organizationId, session.user);

  return {
    context,
    page,
    token: session.token,
  };
}

async function loginManagerWithMfaContext(
  browser: Browser,
  credentials: UserCredentials,
  userId: string
): Promise<LoggedInContext> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await clearTotpStateForUser(userId);

  const secret = authenticator.generateSecret();
  await withDatabaseClient(async (client) => {
    await client.query(
      `UPDATE users
       SET mfa_totp_enabled = TRUE,
           mfa_totp_secret_enc = $1,
           mfa_totp_pending_secret_enc = NULL,
           mfa_totp_enabled_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [encryptWithAppKey(secret), userId]
    );
  });

  const loginResponse = await page.request.post(`${API_URL}/api/v2/auth/login`, {
    data: { email: credentials.email, password: credentials.password },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!loginResponse.ok()) {
    throw new Error(`Failed to initiate MFA login for ${credentials.email} (${loginResponse.status()}): ${await loginResponse.text()}`);
  }

  const loginPayload = unwrapSuccess<{
    mfaRequired?: boolean;
    mfaToken?: string;
    token?: string;
    user?: Record<string, unknown>;
    organizationId?: string;
    organization_id?: string;
  }>(await loginResponse.json());

  if (!loginPayload.mfaRequired || !loginPayload.mfaToken) {
    throw new Error(`Expected MFA challenge for ${credentials.email}, got: ${JSON.stringify(loginPayload)}`);
  }

  const mfaCode = authenticator.generate(secret);
  const completeResponse = await page.request.post(`${API_URL}/api/v2/auth/login/2fa`, {
    data: {
      email: credentials.email,
      mfaToken: loginPayload.mfaToken,
      code: mfaCode,
    },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!completeResponse.ok()) {
    throw new Error(`Failed to complete MFA login for ${credentials.email} (${completeResponse.status()}): ${await completeResponse.text()}`);
  }

  const completePayload = unwrapSuccess<{
    token?: string;
    user?: Record<string, unknown>;
    organizationId?: string;
    organization_id?: string;
  }>(await completeResponse.json());
  const token =
    completePayload.token || extractAuthTokenFromSetCookie(completeResponse.headers()['set-cookie']);
  if (!token) {
    throw new Error(`MFA login response missing token for ${credentials.email}: ${JSON.stringify(completePayload)}`);
  }

  await applyAuthTokenState(page, token, completePayload.organizationId || completePayload.organization_id, completePayload.user);

  return {
    context,
    page,
    token,
  };
}

async function seedWorkspace(
  page: Page,
  adminToken: string,
  organizationAccountId: string,
  managerUser: { id: string },
  staffUser: { id: string }
): Promise<SeededRecord> {
  const runId = uniqueRunId();
  const anchorAccount = await createTestAccount(page, adminToken, {
    name: `QA Anchor Account ${runId}`,
    accountType: 'organization',
    category: 'other',
  });

  const contactOne = await createTestContact(page, adminToken, {
    firstName: 'Avery',
    lastName: 'Manager Contact',
    email: `avery.manager.${runId}@example.com`,
    accountId: organizationAccountId,
    contactType: 'client',
  });

  const contactTwo = await createTestContact(page, adminToken, {
    firstName: 'Blake',
    lastName: 'Staff Contact',
    email: `blake.staff.${runId}@example.com`,
    accountId: organizationAccountId,
    contactType: 'client',
  });

  const caseOneTitle = `Manager Case ${runId}`;
  const caseTwoTitle = `Staff Case ${runId}`;
  const caseOne = await createCaseRecord(page, adminToken, {
    contactId: contactOne.id,
    accountId: organizationAccountId,
    title: caseOneTitle,
    description: 'Case seeded for manager context coverage.',
    assignedTo: managerUser.id,
    priority: 'high',
  });
  const caseTwo = await createCaseRecord(page, adminToken, {
    contactId: contactTwo.id,
    accountId: organizationAccountId,
    title: caseTwoTitle,
    description: 'Case seeded for staff and viewer coverage.',
    assignedTo: staffUser.id,
    priority: 'medium',
  });

  const task = await createTaskRecord(page, adminToken, {
    subject: `Staff Task ${runId}`,
    description: 'Task seeded for staff surface coverage.',
    assignedTo: staffUser.id,
    relatedToType: 'contact',
    relatedToId: contactTwo.id,
  });

  const followUpDate = tomorrowIsoDate(1);
  const followUp = await createFollowUpRecord(page, adminToken, {
    entityType: 'case',
    entityId: caseTwo.id,
    title: `Staff Follow-up ${runId}`,
    description: 'Follow-up seeded for the staff reschedule flow.',
    assignedTo: staffUser.id,
    scheduledDate: followUpDate,
    scheduledTime: '09:30',
  });

  return {
    anchorAccount: { id: anchorAccount.id, name: `QA Anchor Account ${runId}` },
    contactOne: {
      id: contactOne.id,
      name: fullName('Avery', 'Manager Contact'),
      email: `avery.manager.${runId}@example.com`,
    },
    contactTwo: {
      id: contactTwo.id,
      name: fullName('Blake', 'Staff Contact'),
      email: `blake.staff.${runId}@example.com`,
    },
    caseOne: { id: caseOne.id, title: caseOneTitle },
    caseTwo: { id: caseTwo.id, title: caseTwoTitle },
    task: { id: task.id, subject: `Staff Task ${runId}` },
    followUp: { id: followUp.id, title: `Staff Follow-up ${runId}`, scheduledDate: followUpDate },
  };
}

async function assertAdminSurface(
  page: Page,
  token: string,
  users: Array<{ email: string; role: string }>
): Promise<void> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /workbench overview/i }).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.goto('/settings/admin/users', { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page, {
    url: /\/settings\/admin\/users(?:[/?#]|$)/,
    selectors: ['h2:has-text("Account Lookup")', 'input[aria-label="Search users"]'],
    timeoutMs: 30_000,
  });

  const adminHeaders = await getAuthHeaders(page, token);
  for (const user of users) {
    const response = await page.request.get(
      `${API_URL}/api/v2/users?search=${encodeURIComponent(user.email)}`,
      { headers: adminHeaders }
    );
    if (!response.ok()) {
      throw new Error(`Failed to search for ${user.email} (${response.status()}): ${await response.text()}`);
    }

    const payload = unwrapSuccess<{ users?: Array<{ email?: string; role?: string }> }>(await response.json());
    const match = payload.users?.find(
      (candidate) =>
        typeof candidate.email === 'string' &&
        candidate.email.toLowerCase() === user.email.toLowerCase()
    );
    if (!match) {
      throw new Error(`Admin lookup missing ${user.email}: ${JSON.stringify(payload)}`);
    }

    expect((match.role || '').toLowerCase()).toBe(user.role.toLowerCase());
  }

  await page.goto('/settings/admin/workspace_modules', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /workspace modules/i })).toBeVisible({ timeout: 30_000 });
}

async function assertManagerSurface(
  page: Page,
  seeded: SeededRecord,
  updatedCaseTitle: string
): Promise<void> {
  await page.goto('/people', { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page, {
    url: /\/people(?:\?|$)/,
    selectors: ['h2:has-text("DIRECTORY")', 'input[aria-label="Search people"]', 'button:has-text("ALL PEOPLE")'],
    timeoutMs: 30_000,
  });

  await page.goto('/accounts', { waitUntil: 'domcontentloaded' });
  await waitForPageReady(page, {
    url: /\/accounts(?:\?|$)/,
    selectors: ['h1:has-text("Accounts")', 'input[aria-label="Search accounts"]', 'button:has-text("New Account")'],
    timeoutMs: 30_000,
  });

  await page.goto(`/cases/${seeded.caseOne.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(seeded.caseOne.title)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^edit$/i }).first().click();
  await page.waitForURL(new RegExp(`/cases/${seeded.caseOne.id}/edit(?:[/?#]|$)`), {
    timeout: 30_000,
  });

  await page.locator('input[name="title"]').fill(updatedCaseTitle);
  await page.locator('form').getByRole('button', { name: /update case/i }).click();
  await page.waitForURL(new RegExp(`/cases/${seeded.caseOne.id}(?:[/?#]|$)`), {
    timeout: 30_000,
  });
  await expect(page.getByText(updatedCaseTitle)).toBeVisible({ timeout: 30_000 });

  await page.goto(`/contacts/${seeded.contactOne.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(seeded.contactOne.name)).toBeVisible({ timeout: 30_000 });

  await page.goto(`/accounts/${seeded.anchorAccount.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(seeded.anchorAccount.name)).toBeVisible({ timeout: 30_000 });
}

async function assertStaffSurface(page: Page, seeded: SeededRecord): Promise<void> {
  await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible({ timeout: 30_000 });
  const taskSearchInput = page.getByLabel('Search tasks');
  await taskSearchInput.fill(seeded.task.subject);
  await expect(taskSearchInput).toHaveValue(seeded.task.subject);
  await expect(page.locator('tbody tr').filter({ hasText: seeded.task.subject }).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.goto('/follow-ups', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /follow-ups/i })).toBeVisible({ timeout: 30_000 });

  const searchInput = page.getByPlaceholder('Search follow-ups');
  await searchInput.fill(seeded.followUp.title);
  const row = page.locator('tbody tr').filter({ hasText: seeded.followUp.title }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: /reschedule/i }).click();

  const rescheduleDialog = page.getByRole('dialog').filter({ hasText: /reschedule follow-up/i });
  await expect(rescheduleDialog).toBeVisible({ timeout: 30_000 });
  const rescheduledDate = tomorrowIsoDate(2);
  await rescheduleDialog.getByLabel('Date').fill(rescheduledDate);
  await rescheduleDialog.getByLabel(/time/i).fill('10:15');
  await rescheduleDialog.getByRole('button', { name: /^save$/i }).click();

  await expect(row).toContainText(rescheduledDate, { timeout: 30_000 });
}

async function assertViewerSurface(
  page: Page,
  token: string,
  managerUserId: string,
  seeded: SeededRecord
): Promise<void> {
  await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible({ timeout: 30_000 });

  await page.goto('/reports/templates', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /templates/i })).toBeVisible({ timeout: 30_000 });

  await page.goto('/contacts', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /new person/i })).toHaveCount(0);

  await page.goto(`/contacts/${seeded.contactTwo.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(seeded.contactTwo.name)).toBeVisible({ timeout: 30_000 });
  const viewerHeaders = await getAuthHeaders(page, token);
  const contactUpdateResponse = await page.request.put(`${API_URL}/api/v2/contacts/${seeded.contactTwo.id}`, {
    headers: viewerHeaders,
    data: {
      first_name: 'Blocked',
    },
  });
  expect(contactUpdateResponse.status()).toBe(403);

  await page.goto(`/cases/${seeded.caseTwo.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(seeded.caseTwo.title)).toBeVisible({ timeout: 30_000 });
  const caseUpdateResponse = await page.request.put(`${API_URL}/api/v2/cases/${seeded.caseTwo.id}`, {
    headers: viewerHeaders,
    data: {
      title: 'Blocked',
    },
  });
  expect(caseUpdateResponse.status()).toBe(403);

  const response = await page.request.put(`${API_URL}/api/v2/users/${managerUserId}`, {
    headers: viewerHeaders,
    data: {
      firstName: 'Blocked',
    },
  });
  expect(response.status()).toBe(403);
}

test.describe('Fresh workspace multi-user session', () => {
  test('boots a fresh workspace and exercises staff surfaces concurrently', async ({ browser }) => {
    const admin: UserCredentials = {
      email: 'qa-admin@example.com',
      password: 'QaAdmin123!',
      firstName: 'QA',
      lastName: 'Admin',
      role: 'admin',
    };
    const manager: UserCredentials = {
      email: 'qa-manager@example.com',
      password: 'QaManager123!',
      firstName: 'QA',
      lastName: 'Manager',
      role: 'manager',
    };
    const staff: UserCredentials = {
      email: 'qa-staff@example.com',
      password: 'QaStaff123!',
      firstName: 'QA',
      lastName: 'Staff',
      role: 'staff',
    };
    const viewer: UserCredentials = {
      email: 'qa-viewer@example.com',
      password: 'QaViewer123!',
      firstName: 'QA',
      lastName: 'Viewer',
      role: 'viewer',
    };

    const setupContext = await browser.newContext({ baseURL: BASE_URL });
    const setupPage = await setupContext.newPage();
    const contextsToClose: BrowserContext[] = [setupContext];

    try {
      await completeSetupFlow(setupPage, admin);

      const adminContext = await browser.newContext({ baseURL: BASE_URL });
      const adminPage = await adminContext.newPage();
      contextsToClose.push(adminContext);

      const adminSession = await ensureEffectiveAdminLoginViaAPI(adminPage, {
        firstName: admin.firstName,
        lastName: admin.lastName,
        organizationName: 'QA Fresh Workspace',
      });

      const adminUser = {
        email: typeof adminSession.user?.email === 'string' ? adminSession.user.email : admin.email,
        role: typeof adminSession.user?.role === 'string' ? adminSession.user.role : 'admin',
      };
      const organizationAccountId =
        typeof adminSession.user?.organizationId === 'string'
          ? adminSession.user.organizationId
          : typeof adminSession.user?.organization_id === 'string'
            ? adminSession.user.organization_id
            : undefined;
      if (!organizationAccountId) {
        throw new Error('Admin session missing organization account id');
      }

      const managerUser = await createManagedUser(adminPage, adminSession.token, manager);
      const staffUser = await createManagedUser(adminPage, adminSession.token, staff);
      const viewerUser = await createManagedUser(adminPage, adminSession.token, viewer);

      const seeded = await seedWorkspace(
        adminPage,
        adminSession.token,
        organizationAccountId,
        managerUser,
        staffUser
      );

      const managerSession = await loginManagerWithMfaContext(browser, manager, managerUser.id);
      const staffSession = await loginIsolatedContext(browser, staff);
      const viewerSession = await loginIsolatedContext(browser, viewer);
      contextsToClose.push(
        managerSession.context,
        staffSession.context,
        viewerSession.context
      );

      const updatedCaseTitle = `${seeded.caseOne.title} Updated`;

      await Promise.all([
        assertAdminSurface(adminPage, adminSession.token, [adminUser, managerUser, staffUser, viewerUser]),
        assertManagerSurface(managerSession.page, seeded, updatedCaseTitle),
        assertStaffSurface(staffSession.page, seeded),
        assertViewerSurface(viewerSession.page, viewerSession.token, managerUser.id, seeded),
      ]);
    } finally {
      for (const context of contextsToClose.reverse()) {
        await context.close().catch(() => undefined);
      }
    }
  });
});
