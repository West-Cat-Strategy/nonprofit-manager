import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { expect, test, type Page } from '@playwright/test';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { createTestContact } from '../helpers/database';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { waitForPageReady } from '../helpers/routeHelpers';
import { loginPortalUserUI } from '../helpers/portal';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

const STAFF_DOCS_ROOT = path.resolve(__dirname, '..', '..', 'docs', 'help-center', 'staff');
const PORTAL_DOCS_ROOT = path.resolve(__dirname, '..', '..', 'docs', 'help-center', 'portal');
const STAFF_SCREENSHOT_ROOT = path.join(STAFF_DOCS_ROOT, 'assets', 'screenshots');
const PORTAL_SCREENSHOT_ROOT = path.join(PORTAL_DOCS_ROOT, 'assets', 'screenshots');

type PortalUserFixture = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  contactId: string;
};

type CaseFixture = {
  id: string;
  title: string;
  contactId: string;
};

const uniqueSuffix = (): string => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const docsFileUrl = (rootDir: string, filename: string): string =>
  pathToFileURL(path.join(rootDir, filename)).href;

const ensureParentDir = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

const resolveOrganizationId = async (page: Page, token: string): Promise<string | undefined> => {
  const localStorageOrganizationId = await page
    .evaluate(() => localStorage.getItem('organizationId'))
    .catch(() => null);

  return normalizeOrganizationId(localStorageOrganizationId) || getTokenOrganizationId(token);
};

const extractItems = (payload: unknown, keys: string[]): Array<Record<string, unknown>> => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const body = payload as { data?: unknown; [key: string]: unknown };
  const candidate = body.data ?? payload;

  if (Array.isArray(candidate)) {
    return candidate as Array<Record<string, unknown>>;
  }

  if (!candidate || typeof candidate !== 'object') {
    return [];
  }

  for (const key of keys) {
    const value = (candidate as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      return value as Array<Record<string, unknown>>;
    }
  }

  return [];
};

const getReadHeaders = async (page: Page, token: string): Promise<Record<string, string>> => {
  const organizationId = await resolveOrganizationId(page, token);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }
  return headers;
};

const getWriteHeaders = async (page: Page, token: string): Promise<Record<string, string>> => {
  const organizationId = await resolveOrganizationId(page, token);
  const csrfResponse = await page.request.get(`${API_URL}/api/v2/auth/csrf-token`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
    },
  });
  if (!csrfResponse.ok()) {
    throw new Error(`Failed to fetch CSRF token (${csrfResponse.status()}): ${await csrfResponse.text()}`);
  }

  const csrfData = unwrapSuccess<{ csrfToken?: string }>(await csrfResponse.json());
  if (!csrfData?.csrfToken) {
    throw new Error(`CSRF token missing in response: ${JSON.stringify(csrfData)}`);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfData.csrfToken,
  };
  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }

  return headers;
};

const getScreenshotPath = (rootDir: string, relativePath: string): string =>
  path.join(rootDir, relativePath);

const writeShot = async (
  page: Page,
  rootDir: string,
  relativePath: string,
  options: { fullPage?: boolean } = {}
): Promise<string> => {
  const absolutePath = getScreenshotPath(rootDir, relativePath);
  ensureParentDir(absolutePath);
  await page.screenshot({
    path: absolutePath,
    fullPage: options.fullPage ?? false,
    animations: 'disabled',
    caret: 'hide',
  });
  return absolutePath;
};

const writeElementShot = async (
  page: Page,
  rootDir: string,
  selector: string,
  relativePath: string
): Promise<string> => {
  const absolutePath = getScreenshotPath(rootDir, relativePath);
  ensureParentDir(absolutePath);
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: absolutePath,
    animations: 'disabled',
  });
  return absolutePath;
};

const gotoApp = async (page: Page, route: string): Promise<void> => {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0));
};

const gotoDocs = async (page: Page, rootDir: string, filename: string): Promise<void> => {
  await page.goto(docsFileUrl(rootDir, filename), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0));
};

const getCaseTypeId = async (page: Page, token: string): Promise<string> => {
  const headers = await getReadHeaders(page, token);
  const response = await page.request.get(`${API_URL}/api/v2/cases/types`, { headers });
  if (!response.ok()) {
    throw new Error(`Failed to fetch case types (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<unknown>(await response.json());
  const caseTypes = extractItems(payload, ['types', 'items', 'cases']);
  const caseTypeId = caseTypes.find((row) => typeof row.id === 'string' && row.id.length > 0)?.id;
  if (!caseTypeId || typeof caseTypeId !== 'string') {
    throw new Error(`No case type id returned for screenshot fixture: ${JSON.stringify(payload)}`);
  }

  return caseTypeId;
};

const waitForCaseAvailability = async (page: Page, token: string, caseId: string): Promise<void> => {
  const headers = await getReadHeaders(page, token);
  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await page.request.get(`${API_URL}/api/v2/cases/${caseId}`, { headers });
    if (response.ok()) {
      return;
    }

    if (attempt === maxAttempts) {
      throw new Error(`Case ${caseId} was not readable after waiting (${response.status()}): ${await response.text()}`);
    }

    await page.waitForTimeout(500);
  }
};

const clearCases = async (page: Page, token: string): Promise<void> => {
  const headers = await getReadHeaders(page, token);
  const maxPasses = 5;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const response = await page.request.get(`${API_URL}/api/v2/cases?limit=100`, { headers });
    if (!response.ok()) {
      return;
    }

    const payload = await response.json();
    const cases = extractItems(payload, ['cases', 'items']);
    if (cases.length === 0) {
      return;
    }

    let deletedAny = false;
    for (const row of cases) {
      const caseId = typeof row.id === 'string' ? row.id : null;
      if (!caseId) {
        continue;
      }

      const deleteHeaders = await getWriteHeaders(page, token);
      const deleteResponse = await page.request.delete(`${API_URL}/api/v2/cases/${caseId}`, {
        headers: deleteHeaders,
      });
      if (!deleteResponse.ok()) {
        throw new Error(`Failed to delete case ${caseId} (${deleteResponse.status()}): ${await deleteResponse.text()}`);
      }
      deletedAny = true;
    }

    if (!deletedAny) {
      return;
    }
  }
};

const createCaseRecord = async (
  page: Page,
  token: string,
  input: {
    title: string;
    caseTypeId: string;
    contactId: string;
    accountId?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    isUrgent?: boolean;
    clientViewable?: boolean;
  }
): Promise<CaseFixture> => {
  const writeHeaders = await getWriteHeaders(page, token);
  const response = await page.request.post(`${API_URL}/api/v2/cases`, {
    headers: writeHeaders,
    data: {
      contact_id: input.contactId,
      ...(input.accountId ? { account_id: input.accountId } : {}),
      case_type_id: input.caseTypeId,
      title: input.title,
      description: input.description || 'Help center screenshot fixture.',
      priority: input.priority || 'medium',
      is_urgent: input.isUrgent || false,
      client_viewable: input.clientViewable || false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create case (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<Record<string, unknown>>(await response.json());
  const data = payload as { data?: Record<string, unknown>; id?: unknown; case_id?: unknown };
  const id = data.id || data.case_id || data.data?.id || data.data?.case_id;

  if (!id || typeof id !== 'string') {
    throw new Error(`Missing case id in response: ${JSON.stringify(payload)}`);
  }

  await waitForCaseAvailability(page, token, id);

  return {
    id,
    title: input.title,
    contactId: input.contactId,
  };
};

const createCaseNote = async (
  page: Page,
  token: string,
  caseId: string,
  input: {
    content: string;
    visibleToClient?: boolean;
  }
): Promise<void> => {
  const headers = await getWriteHeaders(page, token);
  const response = await page.request.post(`${API_URL}/api/v2/cases/notes`, {
    headers,
    data: {
      case_id: caseId,
      note_type: 'note',
      content: input.content,
      visible_to_client: input.visibleToClient || false,
      is_internal: !input.visibleToClient,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create case note (${response.status()}): ${await response.text()}`);
  }
};

const provisionPortalUserFixture = async (
  page: Page,
  adminToken: string,
  accountId: string,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  } = {}
): Promise<PortalUserFixture> => {
  const unique = uniqueSuffix();
  const firstName = input.firstName || 'Portal';
  const lastName = input.lastName || 'Client';
  const email = input.email || `help-center-portal-cases-${unique}@example.org`;
  const password = input.password || 'Portal123!@#';

  const contact = await createTestContact(page, adminToken, {
    firstName,
    lastName,
    email,
    accountId,
    contactType: 'client',
  });

  const signupResponse = await page.request.post(`${API_URL}/api/v2/portal/auth/signup`, {
    data: {
      email,
      password,
      firstName,
      lastName,
    },
  });
  const signupStatus = signupResponse.status();
  const signupBody = await signupResponse.text();
  const signupAlreadyExists =
    signupStatus === 409 || signupBody.toLowerCase().includes('already exists');

  if (signupStatus !== 201 && !signupAlreadyExists) {
    throw new Error(`Portal signup failed (${signupStatus}): ${signupBody}`);
  }

  const headers = await getWriteHeaders(page, adminToken);
  const requestsResponse = await page.request.get(`${API_URL}/api/v2/portal/admin/requests`, {
    headers,
  });
  if (!requestsResponse.ok()) {
    throw new Error(
      `Failed to list portal signup requests (${requestsResponse.status()}): ${await requestsResponse.text()}`
    );
  }

  const requestPayload = await requestsResponse.json();
  const requests = extractItems(requestPayload, ['requests']);
  const pendingRequest = requests.find(
    (row) => typeof row.email === 'string' && row.email.toLowerCase() === email.toLowerCase()
  );

  if (pendingRequest?.id && typeof pendingRequest.id === 'string') {
    const approveResponse = await page.request.post(
      `${API_URL}/api/v2/portal/admin/requests/${pendingRequest.id}/approve`,
      { headers }
    );
    if (!approveResponse.ok()) {
      throw new Error(
        `Failed to approve portal signup request (${approveResponse.status()}): ${await approveResponse.text()}`
      );
    }
  } else if (!signupAlreadyExists) {
    throw new Error(`Portal signup request for ${email} was not found.`);
  }

  return {
    email,
    password,
    firstName,
    lastName,
    contactId: contact.id,
  };
};

test.describe.serial('help center cases screenshot refresh', () => {
  test.setTimeout(30 * 60 * 1000);

  test('capture screenshot set for the cases help-center docs', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 1200 });

    const adminSession = await ensureEffectiveAdminLoginViaAPI(page, {
      firstName: 'Cases',
      lastName: 'Admin',
      organizationName: 'Cases Help Center Org',
    });
    const adminToken = adminSession.token;
    const organizationId = await resolveOrganizationId(page, adminToken);
    if (!organizationId) {
      throw new Error('Unable to resolve organization context for cases help-center screenshots');
    }

    await clearCases(page, adminToken);

    const screenshotManifest: string[] = [];
    const recordShot = (relativePath: string, absolutePath: string): void => {
      screenshotManifest.push(path.relative(process.cwd(), absolutePath));
      console.log(`[help-center-cases] wrote ${relativePath}`);
    };

    const portalUser = await provisionPortalUserFixture(page, adminToken, organizationId, {
      firstName: 'Portal',
      lastName: 'Client',
      email: `help-center-portal-client-${uniqueSuffix()}@example.org`,
    });

    const portalCaseTypeId = await getCaseTypeId(page, adminToken);
    const staffContact = await createTestContact(page, adminToken, {
      firstName: 'Staff',
      lastName: 'Case',
      email: `help-center-staff-case-${uniqueSuffix()}@example.org`,
      accountId: organizationId,
      contactType: 'client',
    });

    const staffCase = await createCaseRecord(page, adminToken, {
      title: `Staff Queue Case ${uniqueSuffix()}`,
      caseTypeId: portalCaseTypeId,
      contactId: staffContact.id,
      accountId: organizationId,
      description: 'Queue example used for the staff cases help-center screenshots.',
      priority: 'high',
      isUrgent: true,
      clientViewable: false,
    });

    const sharedCase = await createCaseRecord(page, adminToken, {
      title: `Shared Portal Case ${uniqueSuffix()}`,
      caseTypeId: portalCaseTypeId,
      contactId: portalUser.contactId,
      accountId: organizationId,
      description: 'Portal-shared example used for the help-center workflow screenshots.',
      priority: 'medium',
      clientViewable: true,
    });

    await createCaseNote(page, adminToken, sharedCase.id, {
      content: `Visible portal note ${uniqueSuffix()}`,
      visibleToClient: true,
    });

    await gotoDocs(page, STAFF_DOCS_ROOT, 'index.html');
    await waitForPageReady(page, {
      selectors: ['.guide-grid', 'a[href="cases.html"]'],
      timeoutMs: 30_000,
    });
    recordShot(
      'index/landing-guide-cards.png',
      await writeElementShot(page, STAFF_SCREENSHOT_ROOT, '.guide-grid', 'index/landing-guide-cards.png')
    );

    await gotoApp(page, '/cases');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Cases")', 'button:has-text("+ New Case")', 'table'],
      timeoutMs: 30_000,
    });
    recordShot('cases/cases-list.png', await writeShot(page, STAFF_SCREENSHOT_ROOT, 'cases/cases-list.png'));

    const createTitle = `New Case Intake ${uniqueSuffix()}`;
    await gotoApp(
      page,
      `/cases/new?contact_id=${staffContact.id}&case_type_id=${portalCaseTypeId}&title=${encodeURIComponent(createTitle)}&description=${encodeURIComponent('Prefilled case created for the help-center screenshot flow.')}&priority=high&is_urgent=true`
    );
    await waitForPageReady(page, {
      selectors: [
        'h1:has-text("Create New Case")',
        'text=Prefilled context applied from your workflow link.',
      ],
      timeoutMs: 30_000,
    });
    recordShot(
      'cases/cases-create.png',
      await writeShot(page, STAFF_SCREENSHOT_ROOT, 'cases/cases-create.png')
    );

    await gotoApp(page, `/cases/${staffCase.id}`);
    await waitForPageReady(page, {
      selectors: ['button:has-text("Change Status")', '[role="tablist"]'],
      timeoutMs: 30_000,
    });
    await page.getByRole('button', { name: 'Change Status' }).click();
    await waitForPageReady(page, {
      selectors: ['h3:has-text("Change Case Status")', 'button:has-text("Update Status")'],
      timeoutMs: 30_000,
    });
    recordShot(
      'cases/case-status-modal.png',
      await writeShot(page, STAFF_SCREENSHOT_ROOT, 'cases/case-status-modal.png')
    );

    await loginPortalUserUI(page, portalUser);

    await gotoApp(page, '/portal/cases');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("My Cases")', `text=${sharedCase.title}`],
      timeoutMs: 30_000,
    });
    recordShot(
      'cases/portal-cases-list.png',
      await writeShot(page, PORTAL_SCREENSHOT_ROOT, 'cases/portal-cases-list.png')
    );

    await gotoApp(page, `/portal/cases/${sharedCase.id}`);
    await waitForPageReady(page, {
      selectors: [
        `h1:has-text("${sharedCase.title}")`,
        'text=Case Documents',
        '#portal-case-document-file',
      ],
      timeoutMs: 30_000,
    });

    const uploadPath = path.join('/tmp', `help-center-portal-case-${uniqueSuffix()}.txt`);
    const uploadTitle = `Portal upload ${uniqueSuffix()}`;
    fs.writeFileSync(uploadPath, `Help center portal upload ${uniqueSuffix()}\n`, 'utf8');

    await page.locator('#portal-case-document-file').setInputFiles(uploadPath);
    await page.locator('#portal-case-document-name').fill(uploadTitle);
    await page.locator('#portal-case-document-type').selectOption('supporting_document');
    await page.locator('#portal-case-document-description').fill(
      'Uploaded during the help-center cases screenshot refresh.'
    );
    await page.getByRole('button', { name: 'Upload Document' }).click();

    await waitForPageReady(page, {
      selectors: [`text=${uploadTitle}`, 'text=Case Documents'],
      timeoutMs: 30_000,
    });
    recordShot(
      'cases/portal-case-detail.png',
      await writeShot(page, PORTAL_SCREENSHOT_ROOT, 'cases/portal-case-detail.png', {
        fullPage: true,
      })
    );

    expect(screenshotManifest.length).toBe(6);
  });
});
