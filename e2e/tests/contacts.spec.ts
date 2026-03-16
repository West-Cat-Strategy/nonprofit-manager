/**
 * Contacts Module E2E Tests
 * Comprehensive tests for list, create, detail, edit, filter, and delete flows.
 */

import { test, expect } from '../fixtures/auth.fixture';
import type { APIResponse, Page } from '@playwright/test';
import { createTestContact, createTestEvent, clearDatabase } from '../helpers/database';

const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const apiURL = process.env.API_URL || 'http://localhost:3001';

function parseCreatedContactId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelopeData = (payload as Record<string, unknown>).data;
  const data = envelopeData && typeof envelopeData === 'object'
    ? (envelopeData as Record<string, unknown>)
    : null;

  const nestedContact = data?.contact && typeof data.contact === 'object'
    ? (data.contact as Record<string, unknown>)
    : null;

  const candidates: Array<unknown> = [
    (payload as Record<string, unknown>).contact_id,
    data?.contact_id,
    data?.id,
    nestedContact?.contact_id,
    nestedContact?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

async function createContactViaUI(page: Page): Promise<{ contactId: string | null }> {
  const createAttempt = async (): Promise<APIResponse> => {
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        (response.url().includes('/api/v2/contacts') || response.url().includes('/api/v2/contacts')),
      { timeout: 30000 }
    );

    await page.getByRole('button', { name: /create contact/i }).click();
    return createResponsePromise;
  };

  const createResponse = await createAttempt();
  if (!createResponse.ok()) {
    const body = await createResponse.text().catch(() => '');
    const isMissingOrgContext =
      createResponse.status() === 404 && /organization context not found/i.test(body);

    if (isMissingOrgContext) {
      const recoveredOrgId = await page.evaluate(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payloadSegment = token.split('.')[1];
        if (!payloadSegment) return null;
        try {
          const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
          const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
          const decoded = JSON.parse(atob(padded)) as {
            organizationId?: string;
            organization_id?: string;
          };
          const orgId = decoded.organizationId || decoded.organization_id || null;
          if (orgId) {
            localStorage.setItem('organizationId', orgId);
          }
          return orgId;
        } catch {
          return null;
        }
      });

      if (recoveredOrgId) {
        const retryResponse = await createAttempt();
        if (!retryResponse.ok()) {
          const retryBody = await retryResponse.text().catch(() => '');
          throw new Error(
            `Create contact request failed after org-context recovery (${retryResponse.status()}): ${retryBody.slice(0, 600)}`
          );
        }

        let retryPayload: unknown = null;
        try {
          retryPayload = await retryResponse.json();
        } catch {
          retryPayload = null;
        }

        return { contactId: parseCreatedContactId(retryPayload) };
      }
    }

    throw new Error(
      `Create contact request failed (${createResponse.status()}): ${body.slice(0, 600)}`
    );
  }

  let parsedPayload: unknown = null;
  try {
    parsedPayload = await createResponse.json();
  } catch {
    parsedPayload = null;
  }

  return { contactId: parseCreatedContactId(parsedPayload) };
}

async function getContactReadHeaders(page: Page, token: string): Promise<Record<string, string>> {
  const organizationId = await page.evaluate(() => localStorage.getItem('organizationId')).catch(() => null);
  const normalizedToken = token?.trim();
  if (!normalizedToken || normalizedToken === 'null' || normalizedToken === 'undefined') {
    return organizationId && organizationId.trim().length > 0 ? { 'X-Organization-Id': organizationId } : {};
  }

  if (organizationId && organizationId.trim().length > 0) {
    return {
      Authorization: `Bearer ${token}`,
      'X-Organization-Id': organizationId,
    };
  }
  return { Authorization: `Bearer ${token}` };
}

async function waitForContactAvailability(page: Page, token: string, contactId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const headers = await getContactReadHeaders(page, token);
        const endpoints = [`${apiURL}/api/v2/contacts/${contactId}`, `${apiURL}/api/v2/contacts/${contactId}`];

        for (const endpoint of endpoints) {
          const response = await page.request.get(endpoint, { headers });
          if (response.ok()) {
            return true;
          }
          if (response.status() !== 404) {
            return false;
          }
        }

        return false;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .toBe(true);
}

async function waitForContactPhnSuffix(
  page: Page,
  token: string,
  contactId: string,
  expectedPhn: string
): Promise<void> {
  const resolvePhnFromPayload = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const envelopeData = (payload as Record<string, unknown>).data;
    const payloadData = envelopeData && typeof envelopeData === 'object'
      ? (envelopeData as Record<string, unknown>)
      : (payload as Record<string, unknown>);

    const nestedContact =
      payloadData.contact && typeof payloadData.contact === 'object'
        ? (payloadData.contact as Record<string, unknown>)
        : null;

    const candidates: Array<unknown> = [
      payloadData.phn,
      nestedContact?.phn,
      (payload as Record<string, unknown>).phn,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }
      const digits = candidate.replace(/\D/g, '');
      if (digits.length > 0) {
        return digits;
      }
    }

    return null;
  };

  const expectedDigits = expectedPhn.replace(/\D/g, '');
  const expectedSuffix = expectedDigits.slice(-4);

  await expect
    .poll(
      async () => {
        const headers = await getContactReadHeaders(page, token);
        const response = await page.request.get(`${apiURL}/api/v2/contacts/${contactId}`, { headers });

        if (!response.ok()) {
          return null;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        const phnDigits = resolvePhnFromPayload(payload);
        if (!phnDigits) {
          return null;
        }
        if (phnDigits === expectedDigits) {
          return phnDigits;
        }
        if (phnDigits.length <= expectedDigits.length && phnDigits.endsWith(expectedSuffix)) {
          return phnDigits;
        }

        return null;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .not.toBeNull();
}

async function waitForContactDetailReady(page: Page, headingMatcher?: RegExp): Promise<void> {
  await page.getByText(/loading contact\.\.\./i).waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);
  await expect(page.getByRole('tablist', { name: /contact sections/i })).toBeVisible({ timeout: 30000 });
  if (headingMatcher) {
    await expect(page.getByRole('heading', { name: headingMatcher })).toBeVisible({ timeout: 30000 });
  }
}

test.describe('Contacts Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display contacts list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts');

    await expect(authenticatedPage.getByRole('heading', { name: /people/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /new person/i })).toBeVisible();
    await expect(authenticatedPage.getByLabel('Search contacts')).toBeVisible();
  });

  test('contact detail only requests contact-scoped case list', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Scoped${suffix}`,
      lastName: 'Cases',
      email: `scoped.cases.${suffix}@example.com`,
      phone: '5550101234',
    });

    const caseListRequests: string[] = [];
    authenticatedPage.on('request', (request) => {
      const url = request.url();
      if (request.method() === 'GET' && /\/api\/v2\/cases\?/.test(url)) {
        caseListRequests.push(url);
      }
    });

    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage);
    await authenticatedPage.waitForTimeout(800);

    const unscopedCaseRequests = caseListRequests.filter(
      (url) => !url.includes(`contact_id=${contactId}`)
    );
    expect(unscopedCaseRequests).toEqual([]);
  });

  test('should validate create form required and format errors', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByRole('button', { name: /create contact/i }).click();

    await expect(authenticatedPage.getByText(/first name is required/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/last name is required/i)).toBeVisible();

    await authenticatedPage.getByLabel(/first name \*/i).fill('Invalid');
    await authenticatedPage.getByLabel(/last name \*/i).fill('Entry');
    await authenticatedPage.getByLabel(/^email$/i).fill('invalid.entry@example.com');
    await authenticatedPage.locator('input[name="phone"]').fill('12345');
    await authenticatedPage.getByLabel(/personal health number \(phn\)/i).fill('12345');

    await authenticatedPage.getByRole('button', { name: /create contact/i }).click();

    await expect(authenticatedPage.getByText(/phone number must be at least 10 digits/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/phn must contain exactly 10 digits/i)).toBeVisible();
  });

  test('should support PHN create and edit happy path', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const firstName = `Phn${suffix}`;
    const lastName = 'Flow';

    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByLabel(/first name \*/i).fill(firstName);
    await authenticatedPage.getByLabel(/last name \*/i).fill(lastName);
    await authenticatedPage.getByLabel(/^email$/i).fill(`phn.${suffix}@example.com`);
    await authenticatedPage.locator('input[name="phone"]').fill('5550201234');
    await authenticatedPage.getByLabel(/personal health number \(phn\)/i).fill('123-456-7890');

    const { contactId } = await createContactViaUI(authenticatedPage);
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 30000 });

    const contactIdFromUrl = authenticatedPage.url().match(/\/contacts\/([a-f0-9-]+)$/i)?.[1] || null;
    const resolvedContactId = contactIdFromUrl || contactId;
    if (!resolvedContactId) {
      throw new Error('Unable to resolve created contact id');
    }

    await waitForContactAvailability(authenticatedPage, authToken, resolvedContactId);
    await waitForContactDetailReady(authenticatedPage);
    await expect(authenticatedPage.getByText(/1234567890|\*{2,}7890/i)).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /edit contact/i }).click();
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+\/edit$/, { timeout: 30000 });
    await authenticatedPage.getByLabel(/personal health number \(phn\)/i).fill('098-765-4321');
    const updateResponsePromise = authenticatedPage
      .waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/v2/contacts/${resolvedContactId}`),
        { timeout: 30000 }
      )
      .catch(() => null);
    await authenticatedPage.getByRole('button', { name: /update contact/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse).not.toBeNull();
    expect(updateResponse?.ok()).toBeTruthy();

    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 30000 }).catch(async () => {
      await authenticatedPage.goto(`/contacts/${resolvedContactId}`);
    });
    await waitForContactPhnSuffix(authenticatedPage, authToken, resolvedContactId, '098-765-4321');
    await authenticatedPage.reload({ waitUntil: 'domcontentloaded' });
    await waitForContactDetailReady(authenticatedPage);
    await expect(authenticatedPage.getByText(/0987654321|\*{2,}4321/i)).toBeVisible();
  });

  test('should support create -> detail -> edit lifecycle', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const firstName = `Flow${suffix}`;
    const lastName = 'Person';
    const email = `flow.${suffix}@example.com`;
    const phone = '5550201234';
    const mobilePhone = '5550205678';

    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByLabel(/first name \*/i).fill(firstName);
    await authenticatedPage.getByLabel(/last name \*/i).fill(lastName);
    await authenticatedPage.getByLabel(/^email$/i).fill(email);
    await authenticatedPage.getByLabel(/date of birth/i).fill('1986-07-09');
    await authenticatedPage.locator('input[name="phone"]').fill(phone);
    await authenticatedPage.locator('input[name="mobile_phone"]').fill(mobilePhone);
    await authenticatedPage.locator('label', { hasText: /staff/i }).first().click();
    await authenticatedPage.locator('label', { hasText: /board member/i }).first().click();

    const { contactId } = await createContactViaUI(authenticatedPage);

    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 30000 }).catch(async () => {
      if (!contactId) {
        throw new Error('Contact create did not redirect and no contact id was returned');
      }
      await authenticatedPage.goto(`/contacts/${contactId}`);
    });

    const contactIdFromUrl = authenticatedPage.url().match(/\/contacts\/([a-f0-9-]+)$/i)?.[1] || null;
    const resolvedContactId = contactIdFromUrl || contactId;
    if (!resolvedContactId) {
      throw new Error('Unable to resolve created contact id from URL or API response');
    }
    await waitForContactAvailability(authenticatedPage, authToken, resolvedContactId);

    await waitForContactDetailReady(
      authenticatedPage,
      new RegExp(`${firstName} ${lastName}`, 'i')
    );
    await expect(
      authenticatedPage.getByRole('heading', { name: new RegExp(`${firstName} ${lastName}`, 'i') })
    ).toBeVisible();
    await expect(authenticatedPage.getByText('Jul 9, 1986')).toBeVisible();
    await expect(authenticatedPage.getByText(/^Staff$/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/^Board Member$/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: email })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: phone })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: mobilePhone })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /edit contact/i }).click();
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+\/edit$/, { timeout: 30000 });
    await expect(authenticatedPage.getByRole('heading', { name: /edit contact/i })).toBeVisible({
      timeout: 30000,
    });

    const updatedFirstName = `Updated${suffix}`;
    await authenticatedPage.getByLabel(/first name \*/i).fill(updatedFirstName);
    await expect(authenticatedPage.getByLabel(/first name \*/i)).toHaveValue(updatedFirstName);
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).first().click();
    await waitForContactDetailReady(authenticatedPage);
    await expect(
      authenticatedPage.getByRole('heading', {
        name: new RegExp(`${firstName} ${lastName}`, 'i'),
      })
    ).toBeVisible();
  });

  test('should expose explicit inline contact-method submit actions in dark mode', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const firstName = `Dark${suffix}`;
    const lastName = 'Mode';
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName,
    });

    await authenticatedPage.addInitScript(() => {
      localStorage.setItem('app-color-scheme', 'dark');
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    await expect(
      authenticatedPage.getByRole('heading', { name: new RegExp(`${firstName} ${lastName}`, 'i') })
    ).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /\+ add phone/i }).click();
    const addPhoneForm = authenticatedPage.locator('form', {
      has: authenticatedPage.getByRole('button', { name: /^add phone$/i }),
    });
    await expect(addPhoneForm.getByRole('button', { name: /^add phone$/i })).toBeVisible();
    await addPhoneForm.locator('input[type="tel"]').fill('555-888-1000');
    await addPhoneForm.getByRole('button', { name: /^add phone$/i }).click();
    await expect(authenticatedPage.getByRole('link', { name: '555-888-1000' })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /\+ add email/i }).click();
    const addEmailForm = authenticatedPage.locator('form', {
      has: authenticatedPage.getByRole('button', { name: /^add email$/i }),
    });
    await expect(addEmailForm.getByRole('button', { name: /^add email$/i })).toBeVisible();
    await addEmailForm.locator('input[type="email"]').fill(`dark.mode.${suffix}@example.com`);
    await addEmailForm.getByRole('button', { name: /^add email$/i }).click();
    await expect(
      authenticatedPage.getByRole('link', { name: `dark.mode.${suffix}@example.com` })
    ).toBeVisible();
  });

  test('should support detail tab navigation for a contact', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const firstName = `Tabs${suffix}`;
    const lastName = 'Contact';
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName,
      email: `tabs.${suffix}@example.com`,
      phone: '5550201111',
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-notes').getByText(/notes timeline/i)).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-notes').getByText(/no notes yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /tasks/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-tasks').getByRole('button', { name: /new task/i })).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-tasks').getByText(/no tasks yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /activity/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-activity').getByText(/activity timeline/i)).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-activity').getByText(/no activity yet|loading activity/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /communications/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-communications').getByText(/^communications$/i)).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-communications').getByText(/no communications yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /follow-ups/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-followups').getByText(/^follow-ups$/i)).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-followups').getByText(/no follow-ups scheduled/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /documents/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-documents').getByText(/^documents$/i)).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-documents').getByText(/no documents uploaded yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /payments/i }).click();
    await expect(
      authenticatedPage.locator('#tabpanel-payments').getByRole('heading', { name: /payment history/i }).first()
    ).toBeVisible();
  });

  test('should create tasks from the contact detail page', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const taskSubject = `Contact task ${suffix}`;
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Task${suffix}`,
      lastName: 'Contact',
      email: `task.${suffix}@example.com`,
      phone: '5550203333',
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage);

    await authenticatedPage.getByRole('tab', { name: /tasks/i }).click();
    await authenticatedPage.getByRole('button', { name: /new task/i }).click();
    await authenticatedPage.getByLabel(/subject/i).fill(taskSubject);
    await authenticatedPage.getByLabel(/details/i).fill('Created from the contact detail tab');
    await authenticatedPage.getByLabel(/due date/i).fill('2026-03-16T09:30');

    const createTaskResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().includes('/api/v2/tasks'),
      { timeout: 30000 }
    );

    await authenticatedPage.getByRole('button', { name: /create task/i }).click();

    const response = await createTaskResponse;
    expect(response.ok()).toBeTruthy();
    await expect(authenticatedPage.getByText(taskSubject)).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByRole('link', { name: /open task/i })).toBeVisible();
  });

  test('should render event reminder history in the communications tab', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const eventName = `Reminder Event ${suffix}`;
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Comms${suffix}`,
      lastName: 'Contact',
      email: `comms.${suffix}@example.com`,
      phone: '5550206666',
    });
    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: eventName,
      startDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    await authenticatedPage.route(
      `**/api/v2/contacts/${contactId}/communications**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'event-comm',
                  channel: 'email',
                  source_type: 'event_reminder',
                  delivery_status: 'skipped',
                  recipient: `comms.${suffix}@example.com`,
                  error_message: 'SMTP not configured',
                  message_preview: `Reminder: ${eventName} starts soon.`,
                  trigger_type: 'manual',
                  sent_at: new Date().toISOString(),
                  appointment_id: null,
                  case_id: null,
                  event_id: eventId,
                  registration_id: 'registration-1',
                  source_label: eventName,
                  source_subtitle: 'Reminder history seed',
                  action: {
                    type: 'open_event',
                    label: 'Open event',
                    event_id: eventId,
                  },
                },
              ],
              total: 1,
              filters: {},
            },
          }),
        });
      }
    );

    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage);
    await authenticatedPage.getByRole('tab', { name: /communications/i }).click();

    await expect(authenticatedPage.getByText(eventName)).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByRole('link', { name: /open event/i })).toHaveAttribute(
      'href',
      `/events/${eventId}`
    );
  });

  test('should only show appointment resend actions when the communication is safe', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Action${suffix}`,
      lastName: 'Contact',
      email: `action.${suffix}@example.com`,
      phone: '5550207777',
    });
    let reminderSendCount = 0;

    await authenticatedPage.route(
      `**/api/v2/contacts/${id}/communications**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'safe-comm',
                  channel: 'email',
                  source_type: 'appointment_reminder',
                  delivery_status: 'sent',
                  recipient: 'action@example.com',
                  error_message: null,
                  message_preview: 'Reminder for your intake appointment',
                  trigger_type: 'manual',
                  sent_at: new Date().toISOString(),
                  appointment_id: 'appointment-safe',
                  case_id: 'case-safe',
                  event_id: null,
                  registration_id: null,
                  source_label: 'Intake appointment',
                  source_subtitle: 'Safe to resend',
                  action: {
                    type: 'send_appointment_reminder',
                    label: 'Send email reminder again',
                    appointment_id: 'appointment-safe',
                    case_id: 'case-safe',
                  },
                },
                {
                  id: 'unsafe-comm',
                  channel: 'sms',
                  source_type: 'appointment_reminder',
                  delivery_status: 'skipped',
                  recipient: '+15555550100',
                  error_message: 'Appointment start time has passed',
                  message_preview: 'Reminder for a completed appointment',
                  trigger_type: 'automated',
                  sent_at: new Date().toISOString(),
                  appointment_id: 'appointment-unsafe',
                  case_id: 'case-unsafe',
                  event_id: null,
                  registration_id: null,
                  source_label: 'Completed appointment',
                  source_subtitle: 'Not safe to resend',
                  action: {
                    type: 'none',
                    label: 'Unavailable',
                    appointment_id: 'appointment-unsafe',
                    case_id: 'case-unsafe',
                    disabled_reason: 'Appointment start time has passed',
                  },
                },
              ],
              total: 2,
              filters: {},
            },
          }),
        });
      }
    );

    await authenticatedPage.route(
      '**/api/v2/portal/admin/appointments/appointment-safe/reminders/send**',
      async (route) => {
        reminderSendCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              summary: {
                email: { attempted: 1, sent: 1, failed: 0, skipped: 0 },
                sms: { attempted: 0, sent: 0, failed: 0, skipped: 0 },
              },
            },
          }),
        });
      }
    );

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage);
    await authenticatedPage.getByRole('tab', { name: /communications/i }).click();

    await expect(
      authenticatedPage.getByRole('button', { name: /send email reminder again/i })
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole('button', { name: /send sms reminder again/i })
    ).toHaveCount(0);
    await expect(authenticatedPage.getByText(/appointment start time has passed/i)).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /send email reminder again/i }).click();
    await expect.poll(() => reminderSendCount).toBe(1);
  });

  test('should support cancel navigation in create and edit forms', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();

    await authenticatedPage.goto('/contacts/new');
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/contacts$/);

    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Cancel${suffix}`,
      lastName: 'Flow',
      email: `cancel.${suffix}@example.com`,
      phone: '5550204444',
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}/edit`);
    await expect(authenticatedPage.getByRole('heading', { name: /edit contact/i })).toBeVisible({
      timeout: 30000,
    });
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).first().click();
    await waitForContactDetailReady(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(new RegExp(`/contacts/${id}$`));
  });

  test('should search contacts and filter by inactive status', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const activeFirstName = `Enabled${suffix}`;
    const inactiveFirstName = `Dormant${suffix}`;

    const activeContact = await createTestContact(authenticatedPage, authToken, {
      firstName: activeFirstName,
      lastName: 'Contact',
      email: `active.${suffix}@example.com`,
      phone: '5550202001',
    });

    const inactiveContact = await createTestContact(authenticatedPage, authToken, {
      firstName: inactiveFirstName,
      lastName: 'Contact',
      email: `inactive.${suffix}@example.com`,
      phone: '5550202002',
    });

    await authenticatedPage.request.delete(`${apiURL}/api/v2/contacts/${inactiveContact.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    await authenticatedPage.goto('/contacts');

    await authenticatedPage.getByLabel('Search contacts').fill(activeFirstName);
    const searchButton = authenticatedPage.locator('form').getByRole('button', { name: /^search$/i });
    await searchButton.click();
    await expect
      .poll(
        async () => authenticatedPage.locator(`text=${activeFirstName} Contact`).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBeGreaterThan(0);

    await authenticatedPage.getByLabel('Search contacts').fill('');
    await authenticatedPage.getByLabel('Status').selectOption('inactive');
    await searchButton.click();
    await expect
      .poll(
        async () => authenticatedPage.locator(`text=${inactiveFirstName} Contact`).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBeGreaterThan(0);
    await expect
      .poll(
        async () => authenticatedPage.locator(`text=${activeFirstName} Contact`).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBe(0);

    await authenticatedPage.goto(`/contacts/${inactiveContact.id}`);
    await expect(authenticatedPage.getByText(/inactive/i).first()).toBeVisible();

    await authenticatedPage.goto(`/contacts/${activeContact.id}`);
    await expect(authenticatedPage.getByText(/active/i).first()).toBeVisible();
  });

  test('should delete contact from list actions', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const fullName = `Delete${suffix} Contact`;

    await createTestContact(authenticatedPage, authToken, {
      firstName: `Delete${suffix}`,
      lastName: 'Contact',
      email: `delete.${suffix}@example.com`,
      phone: '5550203001',
    });

    await authenticatedPage.goto('/contacts');
    await authenticatedPage.getByLabel('Search contacts').fill(`Delete${suffix}`);
    await authenticatedPage.locator('form').getByRole('button', { name: /^search$/i }).click();
    await expect
      .poll(
        async () => authenticatedPage.locator('tr', { hasText: fullName }).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBeGreaterThan(0);
    const row = authenticatedPage.locator('tr', { hasText: fullName }).first();

    await row.getByRole('button', { name: /delete/i }).click();
    const confirmDeleteDialog = authenticatedPage
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: new RegExp(`Delete\\s+${fullName}`, 'i') });
    await expect(confirmDeleteDialog).toBeVisible({ timeout: 10000 });
    await confirmDeleteDialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(authenticatedPage.locator('tr', { hasText: fullName })).toHaveCount(0, { timeout: 10000 });
  });

  test('should paginate contacts list', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();

    for (let i = 1; i <= 25; i++) {
      await createTestContact(authenticatedPage, authToken, {
        firstName: `Page${suffix}`,
        lastName: `${i.toString().padStart(2, '0')}`,
        email: `page.${suffix}.${i}@example.com`,
        phone: `555020${(1000 + i).toString().slice(-4)}`,
      });
    }

    await authenticatedPage.goto('/contacts');
    await authenticatedPage.getByLabel('Search contacts').fill('');
    const statusFilter = authenticatedPage.getByLabel('Status');
    await statusFilter.selectOption('active').catch(() => statusFilter.selectOption('').catch(() => undefined));
    await authenticatedPage.locator('form').getByRole('button', { name: /^search$/i }).click();

    const nextButton = authenticatedPage.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible({ timeout: 15000 });
    await nextButton.click();

    await expect(authenticatedPage.getByRole('button', { name: /previous/i })).toBeEnabled();
    await expect(authenticatedPage.locator('text=/Page 2 of|Page 2/i')).toBeVisible();
  });
});
