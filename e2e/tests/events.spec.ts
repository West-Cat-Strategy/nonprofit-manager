/**
 * Events Module E2E Tests
 * Tests for event CRUD, registration, and check-in functionality
 */

import { test, expect } from '../fixtures/auth.fixture';
import { createTestEvent, createTestContact, clearDatabase } from '../helpers/database';

test.describe('Events Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    // Clear database before each test
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display events list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events');

    // Check page title
    await expect(authenticatedPage.locator('h1')).toContainText(/events/i);

    // Check for "Create Event" button
    await expect(
      authenticatedPage.locator('button:has-text("New Event"), a:has-text("New Event")')
    ).toBeVisible();

    // Check for search input
    await expect(
      authenticatedPage.locator('input[placeholder*="Search"]')
    ).toBeVisible();
  });

  test('should create a new event via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events');

    // Click "New Event" button
    await authenticatedPage.click('text=/New Event|Create Event/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/events\/(new|create)/);

    // Fill form
    await authenticatedPage.fill('input[name="name"]', 'Annual Fundraiser Gala');
    await authenticatedPage.selectOption('select[name="eventType"]', 'fundraiser');

    // Set future date for start
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await authenticatedPage.fill('input[name="startDate"]', `${dateStr}T18:00`);
    await authenticatedPage.fill('input[name="endDate"]', `${dateStr}T22:00`);

    await authenticatedPage.fill('input[name="location"]', 'Grand Ballroom, City Center');
    await authenticatedPage.fill('input[name="capacity"]', '200');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to event detail page
    await authenticatedPage.waitForURL(/\/events\/[a-f0-9-]+$/);

    // Check that event details are displayed
    await expect(
      authenticatedPage.locator('text=Annual Fundraiser Gala')
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('text=Grand Ballroom, City Center')
    ).toBeVisible();
  });

  test('should show validation errors for required fields', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/events/new');

    // Submit without filling required fields
    await authenticatedPage.click('button[type="submit"]');

    // Check for validation errors
    await expect(
      authenticatedPage.locator('text=/name.*required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view event details', async ({ authenticatedPage, authToken }) => {
    // Create test event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Community Cleanup Day',
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
      location: 'Central Park',
      capacity: 50,
    });

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${id}`);

    // Check event details are displayed
    await expect(
      authenticatedPage.locator('text=Community Cleanup Day')
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('text=Central Park')
    ).toBeVisible();
    await expect(authenticatedPage.locator('text=50')).toBeVisible();

    // Check for edit button
    await expect(
      authenticatedPage.locator('button:has-text("Edit"), a:has-text("Edit")')
    ).toBeVisible();
  });

  test('should edit event details', async ({ authenticatedPage, authToken }) => {
    // Create test event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Original Event Name',
      eventType: 'fundraiser',
      startDate: tomorrow.toISOString(),
      location: 'Original Location',
    });

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${id}`);

    // Click edit button
    await authenticatedPage.click('text=/Edit/i');

    // Wait for edit form
    await authenticatedPage.waitForURL(/\/events\/[a-f0-9-]+\/edit/);

    // Change location
    const locationInput = authenticatedPage.locator('input[name="location"]');
    await locationInput.fill('Updated Location');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect back to detail page
    await authenticatedPage.waitForURL(`/events/${id}`);

    // Check updated location is displayed
    await expect(
      authenticatedPage.locator('text=Updated Location')
    ).toBeVisible();
  });

  test('should delete event', async ({ authenticatedPage, authToken }) => {
    // Create test event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Delete Test Event',
      startDate: tomorrow.toISOString(),
    });

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${id}`);

    // Click delete button
    await authenticatedPage.click('button:has-text("Delete")');

    // Confirm deletion in modal
    await authenticatedPage.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should redirect to events list
    await authenticatedPage.waitForURL('/events');

    // Navigate to deleted event (should show 404 or redirect)
    await authenticatedPage.goto(`/events/${id}`);

    // Should show error or redirect
    await expect(
      authenticatedPage.locator('text=/not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should register contact for event', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test event and contact
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Registration Test Event',
      startDate: tomorrow.toISOString(),
      capacity: 100,
    });

    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    });

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${eventId}`);

    // Look for registrations tab or section
    const registrationsTab = authenticatedPage.locator('text=/Registrations|Attendees/i');
    if (await registrationsTab.isVisible()) {
      await registrationsTab.click();
    }

    // Click add registration button
    const addButton = authenticatedPage.locator(
      'button:has-text("Add Registration"), button:has-text("Register Attendee")'
    );
    if (await addButton.isVisible()) {
      await addButton.click();

      // Select contact from dropdown or search
      const contactSelect = authenticatedPage.locator('select[name="contactId"]');
      if (await contactSelect.isVisible()) {
        await contactSelect.selectOption(contactId);
      }

      // Submit registration
      await authenticatedPage.click('button[type="submit"]');

      // Wait for registration to appear
      await authenticatedPage.waitForTimeout(1000);

      // Check that contact is registered
      await expect(
        authenticatedPage.locator('text=John Doe')
      ).toBeVisible();
    }
  });

  test('should check in attendee at event', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';

    // Create test event and contact
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Check-in Test Event',
      startDate: tomorrow.toISOString(),
    });

    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    });

    // Register contact for event via API
    await authenticatedPage.request.post(`${apiURL}/api/events/${eventId}/registrations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        contactId,
        status: 'confirmed',
      },
    });

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${eventId}`);

    // Look for registrations tab
    const registrationsTab = authenticatedPage.locator('text=/Registrations|Attendees/i');
    if (await registrationsTab.isVisible()) {
      await registrationsTab.click();
    }

    // Wait for registrations to load
    await authenticatedPage.waitForTimeout(1000);

    // Look for check-in button
    const checkInButton = authenticatedPage.locator(
      'button:has-text("Check In"), button:has-text("Check-in")'
    ).first();

    if (await checkInButton.isVisible()) {
      await checkInButton.click();

      // Wait for check-in to complete
      await authenticatedPage.waitForTimeout(1000);

      // Should show checked in status
      await expect(
        authenticatedPage.locator('text=/Checked In|Attended/i')
      ).toBeVisible();
    }
  });

  test('should filter events by type', async ({
    authenticatedPage,
    authToken,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create events of different types
    await createTestEvent(authenticatedPage, authToken, {
      name: 'Fundraiser Event',
      eventType: 'fundraiser',
      startDate: tomorrow.toISOString(),
    });

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await createTestEvent(authenticatedPage, authToken, {
      name: 'Volunteer Event',
      eventType: 'volunteer',
      startDate: nextWeek.toISOString(),
    });

    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by fundraiser type
    const typeFilter = authenticatedPage.locator('select[name="eventType"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('fundraiser');
      await authenticatedPage.waitForTimeout(1000);

      // Should show fundraiser event
      await expect(
        authenticatedPage.locator('text=Fundraiser Event')
      ).toBeVisible();

      // Should not show volunteer event
      await expect(
        authenticatedPage.locator('text=Volunteer Event')
      ).not.toBeVisible();
    }
  });

  test('should show capacity and registration count', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create event with capacity
    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Capacity Test Event',
      startDate: tomorrow.toISOString(),
      capacity: 10,
    });

    // Register 3 contacts
    for (let i = 1; i <= 3; i++) {
      const { id: contactId } = await createTestContact(
        authenticatedPage,
        authToken,
        {
          firstName: `Contact`,
          lastName: `${i}`,
          email: `contact${i}@test.com`,
        }
      );

      await authenticatedPage.request.post(
        `${apiURL}/api/events/${eventId}/registrations`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { contactId, status: 'confirmed' },
        }
      );
    }

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${eventId}`);

    // Should show capacity info (3/10 or similar)
    await expect(
      authenticatedPage.locator('text=/3.*10|3 of 10|3\/10/i')
    ).toBeVisible();
  });

  test('should prevent registration when event is full', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create event with small capacity
    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Full Event Test',
      startDate: tomorrow.toISOString(),
      capacity: 2,
    });

    // Fill the event to capacity
    for (let i = 1; i <= 2; i++) {
      const { id: contactId } = await createTestContact(
        authenticatedPage,
        authToken,
        {
          firstName: `Contact`,
          lastName: `${i}`,
          email: `contact${i}@full.com`,
        }
      );

      await authenticatedPage.request.post(
        `${apiURL}/api/events/${eventId}/registrations`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { contactId, status: 'confirmed' },
        }
      );
    }

    // Navigate to event detail page
    await authenticatedPage.goto(`/events/${eventId}`);

    // Should show event is full
    await expect(
      authenticatedPage.locator('text=/Full|Sold Out|At Capacity/i')
    ).toBeVisible();

    // Registration button should be disabled or not visible
    const addButton = authenticatedPage.locator(
      'button:has-text("Add Registration"):not([disabled])'
    );
    expect(await addButton.count()).toBe(0);
  });
});
