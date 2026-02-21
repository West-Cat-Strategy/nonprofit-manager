/**
 * Events Module E2E Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { createTestEvent, createTestContact, clearDatabase, getAuthHeaders } from '../helpers/database';

test.describe('Events Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display events list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForURL(/\/events(?:\?|$)/);
    await authenticatedPage.waitForLoadState('networkidle');

    await expect(authenticatedPage.getByRole('heading', { level: 1, name: /^events$/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Create Event' })).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search events...')).toBeVisible();
    await expect
      .poll(async () => {
        const tableCount = await authenticatedPage.locator('table').count();
        const emptyStateCount = await authenticatedPage.getByText('No events match your current filters.').count();
        return tableCount + emptyStateCount;
      })
      .toBeGreaterThan(0);
  });

  test('should create a new event via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events/new');
    await authenticatedPage.waitForURL(/\/events\/new$/);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = `${tomorrow.toISOString().split('T')[0]}T18:00`;
    const end = `${tomorrow.toISOString().split('T')[0]}T22:00`;

    await authenticatedPage.fill('input[name="event_name"]', 'Annual Fundraiser Gala');
    await authenticatedPage.selectOption('select[name="event_type"]', 'fundraiser');
    await authenticatedPage.fill('input[name="start_date"]', start);
    await authenticatedPage.fill('input[name="end_date"]', end);
    await authenticatedPage.fill('input[name="location_name"]', 'Grand Ballroom, City Center');
    await authenticatedPage.fill('input[name="capacity"]', '200');

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/events(?:\?|$)/);

    await expect(authenticatedPage.getByText('Annual Fundraiser Gala').first()).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events/new');
    await authenticatedPage.click('button[type="submit"]');
    const validationMessage = await authenticatedPage
      .locator('input[name="event_name"]')
      .evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(validationMessage).toMatch(/fill out this field/i);
  });

  test('should view event details and open edit form', async ({ authenticatedPage, authToken }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Community Cleanup Day',
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
      location: 'Central Park',
      capacity: 50,
    });

    await authenticatedPage.goto(`/events/${id}`);
    await expect(authenticatedPage.getByRole('heading', { name: 'Community Cleanup Day' })).toBeVisible();
    await expect(authenticatedPage.getByText('Central Park')).toBeVisible();

    await authenticatedPage.getByRole('button', { name: 'Edit Event' }).click();
    await authenticatedPage.waitForURL(new RegExp(`/events/${id}/edit$`));
    await expect(authenticatedPage.locator('input[name="location_name"]')).toHaveValue('Central Park');
  });

  test('should register and check in attendee', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Check-in Test Event',
      startDate: tomorrow.toISOString(),
    });
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
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

    const checkInResponse = await authenticatedPage.request.post(
      `${apiURL}/api/v2/events/registrations/${registrationId}/checkin`,
      {
        headers,
      }
    );
    expect(checkInResponse.ok()).toBeTruthy();

    await authenticatedPage.goto(`/events/${eventId}`);
    await expect(authenticatedPage.getByRole('button', { name: /Registrations/i })).toBeVisible();
  });

  test('should filter events by type', async ({ authenticatedPage, authToken }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const suffix = Date.now();
    const fundraiserName = `Fundraiser Event ${suffix}`;
    const volunteerName = `Volunteer Event ${suffix}`;

    await createTestEvent(authenticatedPage, authToken, {
      name: fundraiserName,
      eventType: 'fundraiser',
      startDate: tomorrow.toISOString(),
    });
    await createTestEvent(authenticatedPage, authToken, {
      name: volunteerName,
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
    });

    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForURL(/\/events(?:\?|$)/);
    await authenticatedPage.waitForLoadState('networkidle');
    await authenticatedPage.getByPlaceholder('Search events...').fill(String(suffix));
    await authenticatedPage.locator('select').filter({ has: authenticatedPage.locator('option[value="fundraiser"]') }).first().selectOption('fundraiser');
    await expect(authenticatedPage.locator(`tbody tr:has-text("${fundraiserName}")`).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(authenticatedPage.locator(`tbody tr:has-text("${volunteerName}")`)).toHaveCount(0);
  });

  test('should show capacity and registration count', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Capacity Test Event',
      startDate: tomorrow.toISOString(),
      capacity: 10,
    });

    for (let i = 1; i <= 3; i++) {
      const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
        firstName: `Contact${i}`,
        lastName: 'Load',
        email: `contact${i}@test.com`,
      });
      const response = await authenticatedPage.request.post(`${apiURL}/api/v2/events/${eventId}/register`, {
        headers,
        data: {
          contact_id: contactId,
        },
      });
      expect(response.ok()).toBeTruthy();
    }

    await authenticatedPage.goto(`/events/${eventId}`);
    await expect(authenticatedPage.getByText('Registered')).toBeVisible();
    await expect(authenticatedPage.getByText('3', { exact: true })).toBeVisible();
  });
});
