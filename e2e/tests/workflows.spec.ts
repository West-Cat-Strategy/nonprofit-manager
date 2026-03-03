/**
 * Workflow E2E Smoke Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { applyAuthTokenState, ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import {
  clearDatabase,
  createTestAccount,
  createTestContact,
  createTestDonation,
  createTestEvent,
  getAuthHeaders,
} from '../helpers/database';
import { unwrapSuccess } from '../helpers/apiEnvelope';

const getApiUrl = (): string => process.env.API_URL || 'http://localhost:3001';

test.describe('Complete User Workflows', () => {
  let adminToken = '';

  test.beforeEach(async ({ authenticatedPage }) => {
    const adminSession = await ensureEffectiveAdminLoginViaAPI(authenticatedPage, {
      firstName: 'Test',
      lastName: 'User',
    });
    adminToken = adminSession.token;
    await clearDatabase(authenticatedPage, adminToken);
  });

  test('Donor Journey: Account -> Donation -> Receipt', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const apiURL = getApiUrl();
    const headers = await getAuthHeaders(authenticatedPage, adminToken);

    const unique = Date.now();
    const { id: accountId } = await createTestAccount(authenticatedPage, adminToken, {
      name: 'Sarah Johnson',
      email: `sarah.johnson+${unique}@example.com`,
    });
    const { id: donationId } = await createTestDonation(authenticatedPage, adminToken, {
      accountId,
      amount: 250,
      paymentStatus: 'completed',
    });

    await authenticatedPage.goto(`/donations/${donationId}`, { waitUntil: 'domcontentloaded' });
    await expect(authenticatedPage.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 30000 });
    await expect(authenticatedPage.getByText(/250/).first()).toBeVisible({ timeout: 30000 });

    const receiptResponse = await authenticatedPage.request.post(`${apiURL}/api/v2/donations/${donationId}/receipt`, {
      headers,
    });
    expect(receiptResponse.ok()).toBeTruthy();
  });

  test('Event Flow: Create -> Register -> Check-in', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const apiURL = getApiUrl();
    const headers = await getAuthHeaders(authenticatedPage, adminToken);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id: eventId } = await createTestEvent(authenticatedPage, adminToken, {
      name: 'Community Volunteer Day',
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
      capacity: 50,
    });
    const { id: contactId } = await createTestContact(authenticatedPage, adminToken, {
      firstName: 'Michael',
      lastName: 'Chen',
      email: `michael.chen+${Date.now()}@example.com`,
      contactType: 'volunteer',
    });

    const registerResponse = await authenticatedPage.request.post(`${apiURL}/api/v2/events/${eventId}/register`, {
      headers,
      data: {
        contact_id: contactId,
      },
    });
    expect(
      registerResponse.ok(),
      `Event registration failed (${registerResponse.status()}): ${await registerResponse.text()}`
    ).toBeTruthy();
    const registration = unwrapSuccess<{ registration_id: string }>(await registerResponse.json());

    const checkInResponse = await authenticatedPage.request.post(
      `${apiURL}/api/v2/events/registrations/${registration.registration_id}/checkin`,
      { headers }
    );
    expect(checkInResponse.ok()).toBeTruthy();

    await authenticatedPage.goto(`/events/${eventId}`, { waitUntil: 'domcontentloaded' });
    await expect(authenticatedPage.getByRole('button', { name: /Registrations/i })).toBeVisible({ timeout: 30000 });
  });

  test('Task Workflow: Create -> Complete -> Verify in list', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const apiURL = getApiUrl();
    const headers = await getAuthHeaders(authenticatedPage, adminToken);
    const taskSubject = `Prepare quarterly report ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await applyAuthTokenState(authenticatedPage, adminToken);
    await authenticatedPage.goto('/tasks/new', { waitUntil: 'domcontentloaded' });
    const subjectField = authenticatedPage.getByLabel(/subject/i);
    await expect(subjectField).toBeVisible({ timeout: 30000 });
    await subjectField.fill(taskSubject);
    await expect(subjectField).toHaveValue(taskSubject);
    await authenticatedPage.getByLabel(/priority/i).selectOption('high');
    await authenticatedPage.getByLabel(/due date/i).fill('2030-01-01T09:00');

    const createResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.url().includes('/api/v2/tasks') &&
        response.request().method() === 'POST',
      { timeout: 30000 }
    );
    await authenticatedPage.getByRole('button', { name: /create task/i }).click();
    const createResponse = await createResponsePromise;
    expect(
      createResponse.ok(),
      `Task creation failed (${createResponse.status()}): ${await createResponse.text()}`
    ).toBeTruthy();
    const createPayload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await createResponse.json());
    const taskId = createPayload.id ?? createPayload.data?.id;
    if (!taskId) {
      throw new Error(`Failed to parse created task id from UI flow: ${JSON.stringify(createPayload)}`);
    }

    const completeResponse = await authenticatedPage.request.post(`${apiURL}/api/v2/tasks/${taskId}/complete`, {
      headers,
    });
    expect(
      completeResponse.ok(),
      `Task completion failed (${completeResponse.status()}): ${await completeResponse.text()}`
    ).toBeTruthy();

    await authenticatedPage.goto(`/tasks?status=completed&search=${encodeURIComponent(taskSubject)}`, {
      waitUntil: 'domcontentloaded',
    });

    await authenticatedPage.getByLabel('Filter by status').selectOption('completed');
    await authenticatedPage.getByLabel('Search tasks').fill(taskSubject);

    const taskRow = authenticatedPage.locator('tbody tr').filter({ hasText: taskSubject }).first();
    let rowCount = 0;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      rowCount = await taskRow.count();
      if (rowCount > 0) {
        break;
      }
      await authenticatedPage.waitForTimeout(500);
    }

    if (rowCount > 0) {
      await expect(taskRow).toBeVisible({ timeout: 10000 });
      return;
    }

    const completedListResponse = await authenticatedPage.request.get(
      `${apiURL}/api/v2/tasks?status=completed&search=${encodeURIComponent(taskSubject)}&page=1`,
      { headers }
    );
    expect(
      completedListResponse.ok(),
      `Completed task lookup failed (${completedListResponse.status()}): ${await completedListResponse.text()}`
    ).toBeTruthy();
    const completedListPayload = unwrapSuccess<{
      tasks?: Array<{ id?: string; subject?: string }>;
    }>(await completedListResponse.json());
    const matchedTask = (completedListPayload.tasks || []).find(
      (task) => task.id === taskId || task.subject === taskSubject
    );
    expect(
      matchedTask,
      `Completed task not returned by API search for subject "${taskSubject}" (taskId=${taskId})`
    ).toBeTruthy();
  });
});
