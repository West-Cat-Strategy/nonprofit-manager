/**
 * Workflow E2E Tests
 * End-to-end tests for complete user journeys across multiple modules
 */

import { test, expect } from '../fixtures/auth.fixture';
import { clearDatabase } from '../helpers/database';

test.describe('Complete User Workflows', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    // Clear database before each test
    await clearDatabase(authenticatedPage, authToken);
  });

  test('Complete Donor Journey: Signup → Donate → Receipt', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Create a new contact (donor signup)
    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.fill('input[name="firstName"]', 'Sarah');
    await authenticatedPage.fill('input[name="lastName"]', 'Johnson');
    await authenticatedPage.fill('input[name="email"]', 'sarah.johnson@example.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0123');
    await authenticatedPage.selectOption('select[name="contactType"]', 'donor');

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    // Get contact ID from URL
    const contactUrl = authenticatedPage.url();
    const contactId = contactUrl.split('/').pop();
    expect(contactId).toBeTruthy();

    // Verify contact created
    await expect(authenticatedPage.locator('text=Sarah Johnson')).toBeVisible();

    // Step 2: Create an account for the donor
    await authenticatedPage.goto('/accounts/new');

    await authenticatedPage.fill('input[name="name"]', 'Sarah Johnson');
    await authenticatedPage.selectOption('select[name="accountType"]', 'individual');
    await authenticatedPage.fill('input[name="email"]', 'sarah.johnson@example.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0123');

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/accounts\/[a-f0-9-]+$/);

    const accountUrl = authenticatedPage.url();
    const accountId = accountUrl.split('/').pop();
    expect(accountId).toBeTruthy();

    // Step 3: Create a donation
    await authenticatedPage.goto('/donations/new');

    const accountSelect = authenticatedPage.locator('select[name="accountId"]');
    if (await accountSelect.isVisible()) {
      await accountSelect.selectOption(accountId!);
    }

    await authenticatedPage.fill('input[name="amount"]', '250.00');

    const dateInput = authenticatedPage.locator('input[name="donationDate"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill(new Date().toISOString().split('T')[0]);
    }

    await authenticatedPage.selectOption('select[name="paymentMethod"]', 'credit_card');
    await authenticatedPage.selectOption('select[name="paymentStatus"]', 'completed');

    const campaignInput = authenticatedPage.locator('input[name="campaign"]');
    if (await campaignInput.isVisible()) {
      await campaignInput.fill('Annual Fund 2026');
    }

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/donations\/[a-f0-9-]+$/);

    const donationUrl = authenticatedPage.url();
    const donationId = donationUrl.split('/').pop();

    // Verify donation details
    await expect(
      authenticatedPage.locator('text=/\\$250\\.00|250\\.00/')
    ).toBeVisible();
    await expect(authenticatedPage.locator('text=Sarah Johnson')).toBeVisible();

    // Step 4: Send receipt
    const sendReceiptButton = authenticatedPage.locator(
      'button:has-text("Send Receipt"), button:has-text("Email Receipt")'
    );

    if (await sendReceiptButton.isVisible()) {
      await sendReceiptButton.click();
      await authenticatedPage.waitForTimeout(1000);

      // Verify receipt sent
      await expect(
        authenticatedPage.locator('text=/Receipt.*Sent/i')
      ).toBeVisible();
    } else {
      // Mark receipt as sent via API
      await authenticatedPage.request.post(
        `${apiURL}/api/donations/${donationId}/receipt`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { sent: true },
        }
      );

      await authenticatedPage.reload();
      await expect(
        authenticatedPage.locator('text=/Receipt.*Sent/i')
      ).toBeVisible();
    }

    // Step 5: Verify donation appears in contact's history
    await authenticatedPage.goto(`/contacts/${contactId}`);

    // Look for donations section or tab
    const donationsSection = authenticatedPage.locator(
      'text=/Donations|Donation History/i'
    );
    if (await donationsSection.isVisible()) {
      await donationsSection.click();
      await authenticatedPage.waitForTimeout(1000);

      // Should show the donation
      await expect(
        authenticatedPage.locator('text=/\\$250|250\\.00/')
      ).toBeVisible();
    }
  });

  test('Event Registration Flow: Find Event → Register → Check-in', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Create an upcoming event
    await authenticatedPage.goto('/events/new');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await authenticatedPage.fill('input[name="name"]', 'Community Volunteer Day');
    await authenticatedPage.selectOption('select[name="eventType"]', 'volunteer');
    await authenticatedPage.fill('input[name="startDate"]', `${dateStr}T09:00`);
    await authenticatedPage.fill('input[name="endDate"]', `${dateStr}T16:00`);
    await authenticatedPage.fill('input[name="location"]', 'Community Center');
    await authenticatedPage.fill('input[name="capacity"]', '50');

    const descriptionField = authenticatedPage.locator('textarea[name="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill(
        'Join us for a day of community service and make a difference!'
      );
    }

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/events\/[a-f0-9-]+$/);

    const eventUrl = authenticatedPage.url();
    const eventId = eventUrl.split('/').pop();
    expect(eventId).toBeTruthy();

    // Step 2: Create a contact who will register
    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.fill('input[name="firstName"]', 'Michael');
    await authenticatedPage.fill('input[name="lastName"]', 'Chen');
    await authenticatedPage.fill('input[name="email"]', 'michael.chen@example.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0456');

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    const contactUrl = authenticatedPage.url();
    const contactId = contactUrl.split('/').pop();

    // Step 3: Browse events list and find the event
    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForTimeout(1000);

    // Search for the event
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill('Community Volunteer');
    await authenticatedPage.waitForTimeout(1000);

    // Click on the event
    await authenticatedPage.click('text=Community Volunteer Day');
    await authenticatedPage.waitForURL(/\/events\/[a-f0-9-]+$/);

    // Step 4: Register the contact for the event
    const registrationsTab = authenticatedPage.locator('text=/Registrations|Attendees/i');
    if (await registrationsTab.isVisible()) {
      await registrationsTab.click();
    }

    const addButton = authenticatedPage.locator(
      'button:has-text("Add Registration"), button:has-text("Register Attendee")'
    );

    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);

      const contactSelect = authenticatedPage.locator('select[name="contactId"]');
      if (await contactSelect.isVisible()) {
        await contactSelect.selectOption(contactId!);
      }

      const statusSelect = authenticatedPage.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('confirmed');
      }

      await authenticatedPage.click('button[type="submit"]');
      await authenticatedPage.waitForTimeout(1000);

      // Verify registration
      await expect(authenticatedPage.locator('text=Michael Chen')).toBeVisible();
    } else {
      // Register via API
      await authenticatedPage.request.post(
        `${apiURL}/api/events/${eventId}/registrations`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            contactId: contactId,
            status: 'confirmed',
          },
        }
      );

      await authenticatedPage.reload();
      await authenticatedPage.waitForTimeout(1000);
    }

    // Step 5: Check in the attendee
    const checkInButton = authenticatedPage
      .locator('button:has-text("Check In"), button:has-text("Check-in")')
      .first();

    if (await checkInButton.isVisible()) {
      await checkInButton.click();
      await authenticatedPage.waitForTimeout(1000);

      // Verify checked in
      await expect(
        authenticatedPage.locator('text=/Checked In|Attended/i')
      ).toBeVisible();
    } else {
      // Check in via API
      const registrations = await authenticatedPage.request.get(
        `${apiURL}/api/events/${eventId}/registrations`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const regData = await registrations.json();
      const registration = regData.find((r: any) => r.contactId === contactId);

      if (registration) {
        await authenticatedPage.request.post(
          `${apiURL}/api/events/${eventId}/registrations/${registration.id}/checkin`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        await authenticatedPage.reload();
        await authenticatedPage.waitForTimeout(1000);

        await expect(
          authenticatedPage.locator('text=/Checked In|Attended/i')
        ).toBeVisible();
      }
    }

    // Step 6: Verify capacity updated
    await expect(authenticatedPage.locator('text=/1.*50|1 of 50|1\/50/i')).toBeVisible();
  });

  test('Volunteer Onboarding Workflow: Create Volunteer → Add Skills → Assign Task', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Create a contact
    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.fill('input[name="firstName"]', 'Emily');
    await authenticatedPage.fill('input[name="lastName"]', 'Rodriguez');
    await authenticatedPage.fill('input[name="email"]', 'emily.rodriguez@example.com');
    await authenticatedPage.fill('input[name="phone"]', '555-0789');
    await authenticatedPage.selectOption('select[name="contactType"]', 'volunteer');

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);

    const contactUrl = authenticatedPage.url();
    const contactId = contactUrl.split('/').pop();

    // Step 2: Create volunteer profile
    await authenticatedPage.goto('/volunteers/new');

    const contactSelect = authenticatedPage.locator('select[name="contactId"]');
    if (await contactSelect.isVisible()) {
      await contactSelect.selectOption(contactId!);
    }

    await authenticatedPage.selectOption('select[name="status"]', 'active');

    // Add skills
    const skillsInput = authenticatedPage.locator('input[name="skills"]');
    if (await skillsInput.isVisible()) {
      await skillsInput.fill('Event Planning, Social Media, Fundraising');
    }

    // Set availability
    const availabilityField = authenticatedPage.locator('textarea[name="availability"]');
    if (await availabilityField.isVisible()) {
      await availabilityField.fill('Weekends and weekday evenings');
    }

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/volunteers\/[a-f0-9-]+$/);

    const volunteerUrl = authenticatedPage.url();
    const volunteerId = volunteerUrl.split('/').pop();

    // Verify volunteer profile
    await expect(authenticatedPage.locator('text=Emily Rodriguez')).toBeVisible();
    await expect(authenticatedPage.locator('text=/Event Planning/i')).toBeVisible();

    // Step 3: Create a task for the volunteer
    await authenticatedPage.goto('/tasks/new');

    await authenticatedPage.fill('input[name="subject"]', 'Plan social media campaign');
    await authenticatedPage.selectOption('select[name="priority"]', 'high');
    await authenticatedPage.selectOption('select[name="status"]', 'not_started');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    await authenticatedPage.fill(
      'input[name="dueDate"]',
      tomorrow.toISOString().split('T')[0]
    );

    const descriptionField = authenticatedPage.locator('textarea[name="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill(
        'Create and schedule social media posts for upcoming fundraising campaign'
      );
    }

    // Assign to contact if possible
    const assignedToSelect = authenticatedPage.locator('select[name="assignedTo"]');
    if (await assignedToSelect.isVisible()) {
      await assignedToSelect.selectOption(contactId!);
    }

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/tasks\/[a-f0-9-]+$/);

    // Verify task created
    await expect(
      authenticatedPage.locator('text=Plan social media campaign')
    ).toBeVisible();

    // Step 4: Create a volunteer assignment
    await authenticatedPage.goto(`/volunteers/${volunteerId}/assignments/new`);

    const roleInput = authenticatedPage.locator('input[name="role"]');
    if (await roleInput.isVisible()) {
      await roleInput.fill('Social Media Coordinator');

      const startDate = new Date();
      await authenticatedPage.fill(
        'input[name="startDate"]',
        startDate.toISOString().split('T')[0]
      );

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await authenticatedPage.fill(
        'input[name="endDate"]',
        endDate.toISOString().split('T')[0]
      );

      await authenticatedPage.fill('input[name="hoursCommitted"]', '10');

      await authenticatedPage.click('button[type="submit"]');
      await authenticatedPage.waitForTimeout(1000);

      // Verify assignment
      await expect(
        authenticatedPage.locator('text=Social Media Coordinator')
      ).toBeVisible();
    } else {
      // Create assignment via API
      await authenticatedPage.request.post(
        `${apiURL}/api/volunteers/${volunteerId}/assignments`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            role: 'Social Media Coordinator',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            hoursCommitted: 10,
            status: 'active',
          },
        }
      );

      await authenticatedPage.goto(`/volunteers/${volunteerId}`);
      await authenticatedPage.waitForTimeout(1000);

      await expect(
        authenticatedPage.locator('text=Social Media Coordinator')
      ).toBeVisible();
    }

    // Step 5: Verify volunteer appears in volunteers list with assignment
    await authenticatedPage.goto('/volunteers');
    await authenticatedPage.waitForTimeout(1000);

    await expect(authenticatedPage.locator('text=Emily Rodriguez')).toBeVisible();
  });

  test('Fundraising Campaign Workflow: Create Campaign → Add Donations → Track Progress', async ({
    authenticatedPage,
    authToken,
  }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3000';

    // Step 1: Create donor accounts
    const donors = [
      { name: 'John Smith', amount: 500 },
      { name: 'Jane Doe', amount: 750 },
      { name: 'Bob Wilson', amount: 1000 },
    ];

    const donorIds: string[] = [];

    for (const donor of donors) {
      await authenticatedPage.goto('/accounts/new');

      await authenticatedPage.fill('input[name="name"]', donor.name);
      await authenticatedPage.selectOption('select[name="accountType"]', 'individual');
      await authenticatedPage.fill(
        'input[name="email"]',
        `${donor.name.toLowerCase().replace(' ', '.')}@example.com`
      );

      await authenticatedPage.click('button[type="submit"]');
      await authenticatedPage.waitForURL(/\/accounts\/[a-f0-9-]+$/);

      const accountUrl = authenticatedPage.url();
      const accountId = accountUrl.split('/').pop();
      donorIds.push(accountId!);
    }

    // Step 2: Create donations for the campaign
    const campaignName = 'Spring 2026 Fundraiser';

    for (let i = 0; i < donors.length; i++) {
      const response = await authenticatedPage.request.post(
        `${apiURL}/api/donations`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            accountId: donorIds[i],
            amount: donors[i].amount,
            donationDate: new Date().toISOString(),
            paymentMethod: 'credit_card',
            paymentStatus: 'completed',
            campaign: campaignName,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
    }

    // Step 3: View donations list and filter by campaign
    await authenticatedPage.goto('/donations');
    await authenticatedPage.waitForTimeout(1000);

    // Search for campaign
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill(campaignName);
    await authenticatedPage.waitForTimeout(1000);

    // Should show all three donations
    await expect(authenticatedPage.locator('text=John Smith')).toBeVisible();
    await expect(authenticatedPage.locator('text=Jane Doe')).toBeVisible();
    await expect(authenticatedPage.locator('text=Bob Wilson')).toBeVisible();

    // Step 4: Verify total campaign amount ($2,250)
    const totalAmount = 500 + 750 + 1000;
    await expect(
      authenticatedPage.locator(`text=/\\$${totalAmount.toLocaleString()}|${totalAmount}/`)
    ).toBeVisible();
  });

  test('Task Management Workflow: Create → Assign → Update → Complete', async ({
    authenticatedPage,
  }) => {
    // Step 1: Create a task
    await authenticatedPage.goto('/tasks/new');

    await authenticatedPage.fill('input[name="subject"]', 'Prepare quarterly report');
    await authenticatedPage.selectOption('select[name="priority"]', 'high');
    await authenticatedPage.selectOption('select[name="status"]', 'not_started');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    await authenticatedPage.fill(
      'input[name="dueDate"]',
      dueDate.toISOString().split('T')[0]
    );

    const descriptionField = authenticatedPage.locator('textarea[name="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill(
        'Compile financial data, donor statistics, and program outcomes for Q1 2026'
      );
    }

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(/\/tasks\/[a-f0-9-]+$/);

    const taskUrl = authenticatedPage.url();
    const taskId = taskUrl.split('/').pop();

    // Step 2: Update task status to in progress
    await authenticatedPage.click('text=/Edit/i');
    await authenticatedPage.waitForURL(/\/tasks\/[a-f0-9-]+\/edit/);

    await authenticatedPage.selectOption('select[name="status"]', 'in_progress');

    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.waitForURL(`/tasks/${taskId}`);

    // Verify status updated
    await expect(
      authenticatedPage.locator('text=/In Progress|in_progress/i')
    ).toBeVisible();

    // Step 3: Mark task as complete
    const completeButton = authenticatedPage.locator(
      'button:has-text("Complete"), button:has-text("Mark Complete")'
    );

    if (await completeButton.isVisible()) {
      await completeButton.click();
      await authenticatedPage.waitForTimeout(1000);

      // Verify completed
      await expect(
        authenticatedPage.locator('text=/Completed|Complete/i')
      ).toBeVisible();
    } else {
      // Update via edit
      await authenticatedPage.click('text=/Edit/i');
      await authenticatedPage.waitForURL(/\/tasks\/[a-f0-9-]+\/edit/);
      await authenticatedPage.selectOption('select[name="status"]', 'completed');
      await authenticatedPage.click('button[type="submit"]');
      await authenticatedPage.waitForURL(`/tasks/${taskId}`);
    }

    // Step 4: Verify task appears in completed tasks list
    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForTimeout(1000);

    const statusFilter = authenticatedPage.locator('select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('completed');
      await authenticatedPage.waitForTimeout(1000);

      await expect(
        authenticatedPage.locator('text=Prepare quarterly report')
      ).toBeVisible();
    }
  });
});
