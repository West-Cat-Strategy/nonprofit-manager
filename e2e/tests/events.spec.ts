/**
 * Events Module E2E Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { clearDatabase, createTestEvent, createTestContact, getAuthHeaders } from '../helpers/database';
import { unwrapList } from '../helpers/apiEnvelope';

const makeUnique = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.describe('Events Module', () => {
  let adminToken = '';

  test.beforeEach(async ({ authenticatedPage }) => {
    const adminSession = await ensureEffectiveAdminLoginViaAPI(authenticatedPage, {
      firstName: 'Test',
      lastName: 'User',
    });
    adminToken = adminSession.token;
    await clearDatabase(authenticatedPage, adminToken);
  });

  test('should display events list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForURL(/\/events(?:\?|$)/);

    const eventsHeading = authenticatedPage.getByRole('heading', { level: 1, name: /^events$/i });
    await expect(eventsHeading).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByRole('link', { name: 'Create event' }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole('searchbox', { name: /^search$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole('button', { name: /^today$/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('should create a new event via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events/new');
    await authenticatedPage.waitForURL(/\/events\/new$/);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = `${tomorrow.toISOString().split('T')[0]}T18:00`;
    const end = `${tomorrow.toISOString().split('T')[0]}T22:00`;

    const eventName = makeUnique('Annual Fundraiser Gala');
    await authenticatedPage.fill('input[name="event_name"]', eventName);
    await authenticatedPage.selectOption('select[name="event_type"]', 'fundraiser');
    await authenticatedPage.fill('input[name="start_date"]', start);
    await authenticatedPage.fill('input[name="end_date"]', end);
    await authenticatedPage.fill('input[name="location_name"]', 'Grand Ballroom, City Center');
    await authenticatedPage.fill('input[name="capacity"]', '200');

    const createEventResponsePromise = authenticatedPage.waitForResponse(
      (response) => {
        const isPost = response.request().method() === 'POST';
        const url = response.url();
        return isPost && (url.includes('/api/v2/events') || /\/api\/events(?:\?|$)/.test(url));
      },
      { timeout: 15000 }
    );
    await authenticatedPage.click('button[type="submit"]');
    const createEventResponse = await createEventResponsePromise;
    expect(createEventResponse.ok()).toBeTruthy();
    await authenticatedPage.waitForURL(/\/events(?:\?|$)/);

    const createEventPayload = (await createEventResponse.json().catch(() => null)) as
      | { id?: string; event_id?: string; data?: { id?: string; event_id?: string } }
      | null;
    const eventId =
      createEventPayload?.event_id ||
      createEventPayload?.id ||
      createEventPayload?.data?.event_id ||
      createEventPayload?.data?.id;

    if (typeof eventId === 'string' && eventId.length > 0) {
      await authenticatedPage.goto(`/events/${eventId}`);
      await expect(authenticatedPage.getByRole('heading', { name: eventName })).toBeVisible({
        timeout: 15000,
      });
      return;
    }

    await expect(authenticatedPage.getByRole('button', { name: eventName }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('should show validation errors for required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events/new');
    await authenticatedPage.click('button[type="submit"]');
    const validationMessage = await authenticatedPage
      .locator('input[name="event_name"]')
      .evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(validationMessage).toMatch(/fill out this field/i);
  });

  test('should view event details and open edit form', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id } = await createTestEvent(authenticatedPage, adminToken, {
      name: 'Community Cleanup Day',
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
      location: 'Central Park',
      capacity: 50,
    });

    await authenticatedPage.goto(`/events/${id}`);
    await expect(authenticatedPage.getByRole('heading', { name: 'Community Cleanup Day' })).toBeVisible();
    await expect(authenticatedPage.getByText('Central Park')).toBeVisible();

    await authenticatedPage.getByRole('link', { name: 'Edit event' }).click();
    await authenticatedPage.waitForURL(new RegExp(`/events/${id}/edit(?:\\?|$)`));
    await expect(authenticatedPage.locator('input[name="location_name"]')).toHaveValue('Central Park');
  });

  test('should register and check in attendee', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const checkInWindowStart = new Date(Date.now() + 30 * 60 * 1000);
    const headers = await getAuthHeaders(authenticatedPage, adminToken);

    const unique = makeUnique('register');
    const eventName = `Check-in Test Event ${unique}`;
    const { id: eventId } = await createTestEvent(authenticatedPage, adminToken, {
      name: eventName,
      startDate: checkInWindowStart.toISOString(),
    });
    const { id: contactId } = await createTestContact(authenticatedPage, adminToken, {
      firstName: 'Jane',
      lastName: 'Smith',
      email: `${unique}@example.com`,
    });

    const registrationResponse = await authenticatedPage.request.post(`${apiURL}/api/v2/events/${eventId}/register`, {
      headers,
      data: {
        contact_id: contactId,
      },
    });
    expect(registrationResponse.ok()).toBeTruthy();

    const registrationBody = await registrationResponse.json();
    const registration = registrationBody?.data ?? registrationBody;
    const registrationId = registration.registration_id || registration.id;
    expect(registrationId).toBeTruthy();
    if (typeof registration.occurrence_id === 'string' && registration.occurrence_id.length > 0) {
      await expect.soft(registration.occurrence_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }

    const checkInResponse = await authenticatedPage.request.post(
      `${apiURL}/api/v2/events/registrations/${registrationId}/checkin`,
      {
        headers,
      }
    );
    if (!checkInResponse.ok()) {
      const checkInBody = await checkInResponse.text().catch(() => '<unreadable response body>');
      throw new Error(
        `Event check-in failed (status=${checkInResponse.status()}, eventId=${eventId}, registrationId=${registrationId}): ${checkInBody}`
      );
    }

    const eventDetailResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        /\/api\/v2\/events\/[^/]+$/.test(response.url()) &&
        response.url().includes(`/api/v2/events/${eventId}`),
      { timeout: 15000 }
    );
    await authenticatedPage.goto(`/events/${eventId}`);
    await authenticatedPage.waitForURL(new RegExp(`/events/${eventId}(?:\\?|$)`));
    await eventDetailResponsePromise.catch(() => undefined);
    await expect(authenticatedPage.getByRole('heading', { name: eventName })).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole('button', { name: /Registrations/i })).toBeVisible();
  });

  test('should filter events by type', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const suffix = Date.now();
    const fundraiserName = `Fundraiser Event ${suffix}`;
    const volunteerName = `Volunteer Event ${suffix}`;

    await createTestEvent(authenticatedPage, adminToken, {
      name: fundraiserName,
      eventType: 'fundraiser',
      startDate: tomorrow.toISOString(),
    });
    await createTestEvent(authenticatedPage, adminToken, {
      name: volunteerName,
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
    });

    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForURL(/\/events(?:\?|$)/);
    const searchBox = authenticatedPage.getByRole('searchbox', { name: /^search$/i });
    const typeSelect = authenticatedPage.getByLabel('Type');

    await searchBox.fill(String(suffix));
    await typeSelect.selectOption('fundraiser');
    await expect(searchBox).toHaveValue(String(suffix));
    await expect(typeSelect).toHaveValue('fundraiser');

    await expect
      .poll(
        async () => {
          const filteredOccurrencesResponse = await authenticatedPage.request.get(
            `${apiURL}/api/v2/events/occurrences`,
            {
              params: {
                search: String(suffix),
                event_type: 'fundraiser',
              },
            }
          );

          if (!filteredOccurrencesResponse.ok()) {
            return { hasFundraiser: false, hasVolunteer: true };
          }

          const filteredOccurrences = unwrapList<{
            event_name?: string | null;
            occurrence_name?: string | null;
          }>(await filteredOccurrencesResponse.json());
          const filteredNames = filteredOccurrences.flatMap((occurrence) =>
            [occurrence.event_name, occurrence.occurrence_name].filter(
              (value): value is string => typeof value === 'string' && value.length > 0
            )
          );

          return {
            hasFundraiser: filteredNames.includes(fundraiserName),
            hasVolunteer: filteredNames.includes(volunteerName),
          };
        },
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toEqual({ hasFundraiser: true, hasVolunteer: false });
  });

  test('should show capacity and registration count', async ({ authenticatedPage }) => {
    if (!adminToken) throw new Error('Admin auth token was not initialized');
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const headers = await getAuthHeaders(authenticatedPage, adminToken);

    const unique = makeUnique('capacity');
    const { id: eventId } = await createTestEvent(authenticatedPage, adminToken, {
      name: `Capacity Test Event ${unique}`,
      startDate: tomorrow.toISOString(),
      capacity: 10,
    });

    for (let i = 1; i <= 3; i++) {
      const { id: contactId } = await createTestContact(authenticatedPage, adminToken, {
        firstName: `Contact${i}`,
        lastName: 'Load',
        email: `${unique}-contact${i}@test.com`,
      });
      const response = await authenticatedPage.request.post(`${apiURL}/api/v2/events/${eventId}/register`, {
        headers,
        data: {
          contact_id: contactId,
        },
      });
      expect(response.ok()).toBeTruthy();
    }

    const eventResponse = await authenticatedPage.request.get(`${apiURL}/api/v2/events/${eventId}`, {
      headers,
    });
    expect(eventResponse.ok()).toBeTruthy();
    const eventBody = await eventResponse.json();
    const eventPayload = (eventBody?.data ?? eventBody) as Record<string, unknown>;
    expect(Number(eventPayload.registered_count ?? eventPayload.registeredCount ?? 0)).toBe(3);
    expect(Number(eventPayload.capacity ?? 0)).toBe(10);

    const registrationsResponse = await authenticatedPage.request.get(
      `${apiURL}/api/v2/events/${eventId}/registrations`,
      {
        headers,
      }
    );
    expect(registrationsResponse.ok()).toBeTruthy();
    const registrationsBody = await registrationsResponse.json();
    const registrationsPayload = registrationsBody?.data ?? registrationsBody;
    const registrations = Array.isArray(registrationsPayload)
      ? registrationsPayload
      : Array.isArray(registrationsPayload?.items)
        ? registrationsPayload.items
        : [];
    expect(registrations).toHaveLength(3);
  });
});
