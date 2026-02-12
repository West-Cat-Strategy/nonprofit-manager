/**
 * Workflow E2E Smoke Tests
 */

import { test, expect } from '../fixtures/auth.fixture';
import { createTestAccount, createTestDonation, createTestEvent } from '../helpers/database';

test.describe.skip('Complete User Workflows', () => {
  test('Donor Journey: Account -> Donation -> Receipt', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';

    const { id: accountId } = await createTestAccount(authenticatedPage, authToken, {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
    });
    const { id: donationId } = await createTestDonation(authenticatedPage, authToken, {
      accountId,
      amount: 250,
      paymentStatus: 'completed',
    });

    await authenticatedPage.goto(`/donations/${donationId}`);
    await expect(authenticatedPage.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(authenticatedPage.getByText(/250/).first()).toBeVisible();

    const receiptResponse = await authenticatedPage.request.post(`${apiURL}/api/donations/${donationId}/receipt`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(receiptResponse.ok()).toBeTruthy();
  });

  test('Event Flow: Create -> Register -> Check-in', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: 'Community Volunteer Day',
      eventType: 'volunteer',
      startDate: tomorrow.toISOString(),
      capacity: 50,
    });

    const registerResponse = await authenticatedPage.request.post(`${apiURL}/api/events/${eventId}/register`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        attendee_name: 'Michael Chen',
        attendee_email: 'michael.chen@example.com',
      },
    });
    expect(registerResponse.ok()).toBeTruthy();
    const registration = await registerResponse.json();

    const checkInResponse = await authenticatedPage.request.post(
      `${apiURL}/api/events/registrations/${registration.registration_id}/checkin`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    expect(checkInResponse.ok()).toBeTruthy();

    await authenticatedPage.goto(`/events/${eventId}`);
    await expect(authenticatedPage.getByRole('button', { name: /Registrations/i })).toBeVisible();
  });

  test('Task Workflow: Create -> Complete -> Verify in list', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';

    const createResponse = await authenticatedPage.request.post(`${apiURL}/api/tasks`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        subject: 'Prepare quarterly report',
        status: 'not_started',
        priority: 'high',
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createdTask = await createResponse.json();

    const completeResponse = await authenticatedPage.request.post(
      `${apiURL}/api/tasks/${createdTask.id}/complete`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    expect(completeResponse.ok()).toBeTruthy();

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.getByLabel('Filter by status').selectOption('completed');
    await expect(authenticatedPage.getByText('Prepare quarterly report').first()).toBeVisible();
  });
});
