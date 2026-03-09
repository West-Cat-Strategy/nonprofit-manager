import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { applyAuthTokenState, ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { getAuthHeaders, clearDatabase, createTestContact } from '../helpers/database';
import { unwrapList, unwrapSuccess } from '../helpers/apiEnvelope';
import { loginPortalUserUI } from '../helpers/portal';

const getApiUrl = (): string => process.env.API_URL || 'http://localhost:3001';

type PortalRequestRow = {
  id: string;
  email: string;
};

const toPortalRequestRows = (payload: unknown): PortalRequestRow[] => {
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

const provisionPortalUser = async (
  page: Page,
  adminToken: string
): Promise<{ email: string; password: string; contactId: string }> => {
  const apiURL = getApiUrl();
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `portal-e2e-${uniqueSuffix}@example.com`;
  const password = 'Portal123!@#';

  const contact = await createTestContact(page, adminToken, {
    firstName: 'Portal',
    lastName: 'Client',
    email,
    contactType: 'client',
  });

  const signupResponse = await page.request.post(`${apiURL}/api/v2/portal/auth/signup`, {
    data: {
      email,
      password,
      firstName: 'Portal',
      lastName: 'Client',
    },
  });
  if (signupResponse.status() !== 201) {
    throw new Error(
      `Portal signup failed (${signupResponse.status()}): ${await signupResponse.text()}`
    );
  }

  const adminHeaders = await getAuthHeaders(page, adminToken);
  const pendingRequestsResponse = await page.request.get(`${apiURL}/api/v2/portal/admin/requests`, {
    headers: adminHeaders,
  });
  if (!pendingRequestsResponse.ok()) {
    throw new Error(
      `Failed to list portal signup requests (${pendingRequestsResponse.status()}): ${await pendingRequestsResponse.text()}`
    );
  }
  const pendingRequests = toPortalRequestRows(await pendingRequestsResponse.json());
  const pendingRequest = pendingRequests.find(
    (request) => typeof request.email === 'string' && request.email.toLowerCase() === email
  );

  if (!pendingRequest?.id) {
    throw new Error(`Portal signup request for ${email} not found`);
  }

  const approveResponse = await page.request.post(
    `${apiURL}/api/v2/portal/admin/requests/${pendingRequest.id}/approve`,
    { headers: adminHeaders }
  );
  if (!approveResponse.ok()) {
    throw new Error(
      `Failed to approve portal request (${approveResponse.status()}): ${await approveResponse.text()}`
    );
  }

  return {
    email,
    password,
    contactId: contact.id,
  };
};

test.describe('Events Hybrid Check-In', () => {
  let adminToken = '';

  test.beforeEach(async ({ authenticatedPage }) => {
    const adminSession = await ensureEffectiveAdminLoginViaAPI(authenticatedPage, {
      firstName: 'Hybrid',
      lastName: 'Admin',
    });
    adminToken = adminSession.token;
    await clearDatabase(authenticatedPage, adminToken);
  });

  test('completes kiosk + portal pass + staff scan + walk-in flow', async ({ authenticatedPage }) => {
    if (!adminToken) {
      throw new Error('Admin auth token was not initialized');
    }

    const apiURL = getApiUrl();
    const headers = await getAuthHeaders(authenticatedPage, adminToken);
    const now = Date.now();
    const eventName = `Hybrid Check-In Event ${now}`;
    const startDate = new Date(now + 30 * 60 * 1000).toISOString();
    const endDate = new Date(now + 2 * 60 * 60 * 1000).toISOString();

    const createEventResponse = await authenticatedPage.request.post(`${apiURL}/api/v2/events`, {
      headers,
      data: {
        event_name: eventName,
        event_type: 'community',
        is_public: true,
        start_date: startDate,
        end_date: endDate,
        location_name: 'Main Hall',
      },
    });
    expect(
      createEventResponse.ok(),
      `Failed to create hybrid event (${createEventResponse.status()}): ${await createEventResponse.text()}`
    ).toBeTruthy();
    const createdEvent = unwrapSuccess<{ event_id?: string; id?: string }>(
      await createEventResponse.json()
    );
    const eventId = createdEvent.event_id || createdEvent.id;
    if (!eventId) {
      throw new Error(`Unable to parse event id from response: ${JSON.stringify(createdEvent)}`);
    }

    await applyAuthTokenState(authenticatedPage, adminToken);
    await authenticatedPage.goto(`/events/${eventId}`);
    await authenticatedPage.getByRole('button', { name: /Registrations/i }).click();
    await expect(authenticatedPage.getByText('Public Kiosk Check-In')).toBeVisible({ timeout: 30000 });

    const kioskToggle = authenticatedPage.getByLabel('Enable public kiosk');
    await kioskToggle.check();
    await authenticatedPage.getByRole('button', { name: 'Save' }).click();
    await expect(authenticatedPage.getByText('Public kiosk enabled.')).toBeVisible({ timeout: 15000 });

    await authenticatedPage.getByRole('button', { name: 'Rotate PIN' }).click();
    const pinLine = authenticatedPage.locator('p', { hasText: 'Current PIN:' }).first();
    await expect(pinLine).toBeVisible({ timeout: 15000 });
    const pinText = (await pinLine.textContent()) || '';
    const pin = pinText.match(/Current PIN:\s*(\d{6})/)?.[1];
    if (!pin) {
      throw new Error(`Unable to parse kiosk PIN from line: ${pinText}`);
    }

    const kioskAttendeeEmail = `public-kiosk-${now}@example.com`;
    await authenticatedPage.goto(`/event-check-in/${eventId}`);
    await expect(authenticatedPage.getByText(eventName)).toBeVisible({ timeout: 30000 });

    await authenticatedPage.getByLabel('First name').fill('Public');
    await authenticatedPage.getByLabel('Last name').fill('Attendee');
    await authenticatedPage.getByLabel('Email').fill(kioskAttendeeEmail);
    await authenticatedPage.getByLabel('Staff PIN').fill(pin);
    await authenticatedPage.getByRole('button', { name: 'Complete check-in' }).click();
    await expect(authenticatedPage.getByText('Check-in complete. Welcome!')).toBeVisible({
      timeout: 15000,
    });

    await authenticatedPage.getByLabel('First name').fill('Public');
    await authenticatedPage.getByLabel('Last name').fill('Attendee');
    await authenticatedPage.getByLabel('Email').fill(kioskAttendeeEmail);
    await authenticatedPage.getByLabel('Staff PIN').fill(pin);
    await authenticatedPage.getByRole('button', { name: 'Complete check-in' }).click();
    await expect(authenticatedPage.getByText('This attendee is already checked in.')).toBeVisible({
      timeout: 15000,
    });

    const portalUser = await provisionPortalUser(authenticatedPage, adminToken);
    await loginPortalUserUI(authenticatedPage, portalUser);
    await authenticatedPage.goto('/portal/events');

    const eventCard = authenticatedPage.locator('li').filter({ hasText: eventName }).first();
    await expect(eventCard).toBeVisible({ timeout: 30000 });
    await eventCard.getByRole('button', { name: 'Register' }).click();
    await expect(eventCard.getByText('Registered')).toBeVisible({ timeout: 20000 });

    await eventCard.getByRole('button', { name: 'QR Pass' }).click();
    await expect(authenticatedPage.getByRole('heading', { name: 'Event QR Pass' })).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole('button', { name: 'Download PNG' })).toBeVisible();
    await authenticatedPage
      .locator('.fixed.inset-0')
      .getByRole('button', { name: 'Close' })
      .click();

    await applyAuthTokenState(authenticatedPage, adminToken);
    const registrationsResponse = await authenticatedPage.request.get(
      `${apiURL}/api/v2/events/${eventId}/registrations`,
      { headers }
    );
    expect(
      registrationsResponse.ok(),
      `Failed to load registrations (${registrationsResponse.status()}): ${await registrationsResponse.text()}`
    ).toBeTruthy();
    const registrations = unwrapList<{
      contact_id: string;
      check_in_token?: string | null;
    }>(await registrationsResponse.json());
    const portalRegistration = registrations.find(
      (registration) => registration.contact_id === portalUser.contactId
    );
    if (!portalRegistration?.check_in_token) {
      throw new Error(
        `Portal attendee registration token not found for contact ${portalUser.contactId}`
      );
    }

    await authenticatedPage.goto('/events/check-in');
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Event Check-In Desk' })
    ).toBeVisible({ timeout: 30000 });
    await authenticatedPage.getByPlaceholder('Scan token').fill(portalRegistration.check_in_token);
    await authenticatedPage.getByRole('button', { name: /^Check In$/ }).first().click();
    await expect(authenticatedPage.getByText(/Checked in/i)).toBeVisible({ timeout: 15000 });

    if (!authenticatedPage.url().includes('/events/check-in')) {
      await authenticatedPage.goto('/events/check-in');
    }
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Event Check-In Desk' })
    ).toBeVisible({ timeout: 15000 });

    const walkInSection = authenticatedPage
      .locator('section, div')
      .filter({ has: authenticatedPage.getByRole('heading', { name: 'Walk-In Quick Add' }) })
      .first();
    await expect(walkInSection).toBeVisible({ timeout: 15000 });

    const walkInEventSelect = walkInSection.locator('select').first();
    await expect(walkInEventSelect).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => walkInEventSelect.locator(`option[value="${eventId}"]`).count(), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
    await walkInEventSelect.selectOption(eventId);

    await walkInSection.getByLabel('First name').fill('Walkin');
    await walkInSection.getByLabel('Last name').fill('Guest');
    await walkInSection.getByLabel('Email (or phone)').fill(`walkin-${now}@example.com`);
    await walkInSection.getByRole('button', { name: 'Register + Check In' }).click();
    await expect(
      authenticatedPage.getByText('Walk-in registered and checked in.')
    ).toBeVisible({ timeout: 15000 });

    const eventResponse = await authenticatedPage.request.get(`${apiURL}/api/v2/events/${eventId}`, {
      headers,
    });
    expect(
      eventResponse.ok(),
      `Failed to fetch final event counts (${eventResponse.status()}): ${await eventResponse.text()}`
    ).toBeTruthy();
    const eventPayload = unwrapSuccess<{
      registered_count?: number;
      attended_count?: number;
    }>(await eventResponse.json());
    expect(Number(eventPayload.registered_count ?? 0)).toBeGreaterThanOrEqual(3);
    expect(Number(eventPayload.attended_count ?? 0)).toBeGreaterThanOrEqual(3);
  });
});
