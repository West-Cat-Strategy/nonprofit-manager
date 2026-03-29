import { test, expect, type Page } from '../fixtures/auth.fixture';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { clearDatabase, createTestContact, getAuthHeaders } from '../helpers/database';
import { unwrapSuccess } from '../helpers/apiEnvelope';

const apiURL = process.env.API_URL || 'http://localhost:3001';

const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

async function getFirstCaseTypeId(page: Page, token: string): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.get(`${apiURL}/api/v2/cases/types`, { headers });
  if (!response.ok()) {
    throw new Error(`Failed to fetch case types (${response.status()}): ${await response.text()}`);
  }

  const rawPayload = await response.json();
  const payload = unwrapSuccess<{
    types?: Array<{ id?: string; case_type_id?: string }>;
    data?: Array<{ id?: string; case_type_id?: string }>;
    items?: Array<{ id?: string; case_type_id?: string }>;
  }>(rawPayload);

  const typeEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.types)
      ? payload.types
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : [];
  const firstType = typeEntries.find((entry) => Boolean(entry?.id || entry?.case_type_id));
  const firstTypeId = firstType?.id || firstType?.case_type_id;
  if (!firstTypeId) {
    throw new Error(`No case types available. Payload: ${JSON.stringify(rawPayload)}`);
  }

  return firstTypeId;
}

async function createCase(
  page: Page,
  token: string,
  title: string
): Promise<{ id: string; caseNumber: string }> {
  const organizationId = await page.evaluate(() => localStorage.getItem('organizationId'));
  const contact = await createTestContact(page, token, {
    firstName: 'FollowUp',
    lastName: `Contact ${uniqueSuffix()}`,
    email: `followup.${uniqueSuffix()}@example.com`,
    contactType: 'client',
    accountId: organizationId || undefined,
  });
  const caseTypeId = await getFirstCaseTypeId(page, token);
  const headers = await getAuthHeaders(page, token);

  const response = await page.request.post(`${apiURL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: contact.id,
      case_type_id: caseTypeId,
      title,
      description: 'Follow-up automation test case',
      priority: 'medium',
      is_urgent: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create case (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{
    id?: string;
    case_number?: string;
    data?: { id?: string; case_number?: string };
  }>(await response.json());
  const caseId = payload?.id || payload?.data?.id;
  if (!caseId) {
    throw new Error(`Missing case id from create response: ${JSON.stringify(payload)}`);
  }

  const caseNumber = payload?.case_number || payload?.data?.case_number;
  if (!caseNumber) {
    throw new Error(`Missing case number from create response: ${JSON.stringify(payload)}`);
  }

  return { id: caseId, caseNumber };
}

async function createTask(page: Page, token: string, subject: string): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/tasks`, {
    headers,
    data: {
      subject,
      status: 'not_started',
      priority: 'normal',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create task (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
  const taskId = payload?.id || payload?.data?.id;
  if (!taskId) {
    throw new Error(`Missing task id from create response: ${JSON.stringify(payload)}`);
  }

  return taskId;
}

test.describe('Follow-ups workflow', () => {
  let adminToken = '';

  test.beforeEach(async ({ authenticatedPage }) => {
    const adminSession = await ensureEffectiveAdminLoginViaAPI(authenticatedPage, {
      firstName: 'Test',
      lastName: 'User',
    });
    adminToken = adminSession.token;
    await clearDatabase(authenticatedPage, adminToken);
  });

  test('creates, edits, reschedules, and deletes follow-ups with the entity picker flow', async ({ authenticatedPage }) => {
    if (!adminToken) {
      throw new Error('Admin auth token was not initialized');
    }
    const suffix = uniqueSuffix();
    const caseTitle = `Follow-up Case ${suffix}`;
    const taskSubject = `Follow-up Task ${suffix}`;
    const followUpTitle = `Call Back ${suffix}`;
    const updatedTitle = `Call Back Updated ${suffix}`;

    const createdCase = await createCase(authenticatedPage, adminToken, caseTitle);
    await createTask(authenticatedPage, adminToken, taskSubject);

    await authenticatedPage.goto('/follow-ups');
    await expect(authenticatedPage.getByRole('heading', { name: /follow-ups/i })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /create follow-up/i }).click();

    const entitySearchInput = authenticatedPage.getByPlaceholder('Search by case number/title');
    await entitySearchInput.fill(caseTitle);
    const caseOption = authenticatedPage
      .locator('li button')
      .filter({ hasText: caseTitle })
      .first();
    await expect(caseOption).toBeVisible({ timeout: 30000 });
    await caseOption.click();

    await authenticatedPage.locator('#followup-title').fill(followUpTitle);
    await authenticatedPage.getByRole('button', { name: /schedule follow-up/i }).click();

    const followUpsSearchInput = authenticatedPage.getByPlaceholder('Search follow-ups');
    await followUpsSearchInput.fill(followUpTitle);
    const createdRow = authenticatedPage.locator('tbody tr').filter({ hasText: followUpTitle }).first();
    await expect(createdRow).toBeVisible({ timeout: 15000 });

    await createdRow.getByRole('button', { name: /^edit$/i }).click();
    await authenticatedPage.locator('#followup-title').fill(updatedTitle);
    await authenticatedPage.getByRole('button', { name: /update follow-up/i }).click();

    await followUpsSearchInput.fill(updatedTitle);
    const updatedRow = authenticatedPage.locator('tbody tr').filter({ hasText: updatedTitle }).first();
    await expect(updatedRow).toBeVisible({ timeout: 15000 });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const rescheduleDate = tomorrow.toISOString().split('T')[0];

    await updatedRow.getByRole('button', { name: /reschedule/i }).click();
    const rescheduleDialog = authenticatedPage
      .getByRole('dialog')
      .filter({ hasText: /reschedule follow-up/i });
    await expect(rescheduleDialog).toBeVisible();
    await rescheduleDialog.getByLabel('Date').fill(rescheduleDate);
    await rescheduleDialog.getByLabel(/time/i).fill('09:30');
    await rescheduleDialog.getByRole('button', { name: /^save$/i }).click();

    await expect(updatedRow).toContainText(rescheduleDate, { timeout: 15000 });

    await updatedRow.getByRole('button', { name: /^delete$/i }).click();
    const confirmDeleteDialog = authenticatedPage
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: /delete follow-up/i });
    await expect(confirmDeleteDialog).toBeVisible();
    await confirmDeleteDialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(authenticatedPage.locator('tbody tr').filter({ hasText: updatedTitle })).toHaveCount(0, {
      timeout: 15000,
    });
  });
});
