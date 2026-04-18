import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import {
  createTestEvent,
  createTestVolunteer,
  createTestVolunteerAssignment,
} from '../helpers/database';

const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const waitForVolunteerRow = async (page: Page, fullName: string) => {
    await expect
        .poll(
            async () => page.locator('tr', { hasText: fullName }).count(),
            { timeout: 15000, intervals: [500, 1000, 1500] }
        )
        .toBeGreaterThan(0);

    return page.locator('tr', { hasText: fullName }).first();
};

test.describe('Volunteers Module', () => {
    test('should display volunteers list page', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/volunteers');

        await expect(
            authenticatedPage.getByRole('heading', { level: 1, name: /^volunteers$/i })
        ).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /new volunteer/i })).toBeVisible();
    });

    test('should create a new volunteer via UI', async ({ authenticatedPage }) => {
        const suffix = `${Date.now()}`;
        const firstName = `Vol${suffix}`;
        const lastName = 'Contact';
        const contactEmail = `volunteer.${suffix}@test.com`;

        await authenticatedPage.goto('/contacts/new');
        await authenticatedPage.getByLabel(/first name \*/i).fill(firstName);
        await authenticatedPage.getByLabel(/last name \*/i).fill(lastName);
        await authenticatedPage.getByLabel(/^email$/i).fill(contactEmail);
        await authenticatedPage.locator('input[name="phone"]').fill('5550201234');
        await authenticatedPage.getByRole('button', { name: /create contact/i }).click();
        await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/);
        const createdContactMatch = authenticatedPage.url().match(/\/contacts\/([a-f0-9-]+)$/i);
        expect(createdContactMatch).not.toBeNull();
        const createdContactId = createdContactMatch?.[1] ?? '';

        await authenticatedPage.goto('/volunteers/new');

        const contactSelect = authenticatedPage.getByLabel(/select contact/i);
        await expect
            .poll(async () => await contactSelect.locator(`option[value="${createdContactId}"]`).count())
            .toBe(1);
        await contactSelect.selectOption(createdContactId);
        await expect(contactSelect).toHaveValue(createdContactId);
        await authenticatedPage.getByLabel(/background check status/i).selectOption('pending');

        const createVolunteerResponsePromise = authenticatedPage.waitForResponse((response) => {
            return response.url().includes('/api/v2/volunteers') && response.request().method() === 'POST';
        });
        await authenticatedPage.getByRole('button', { name: /create volunteer/i }).click();
        const createVolunteerResponse = await createVolunteerResponsePromise;
        if (!createVolunteerResponse.ok()) {
            const responseBody = await createVolunteerResponse.text();
            throw new Error(
                `Volunteer create failed (${createVolunteerResponse.status()}): ${responseBody}`
            );
        }

        await expect(authenticatedPage).toHaveURL(/\/volunteers(?:\?|$)/);
        await expect(authenticatedPage.getByText(new RegExp(`${firstName} ${lastName}`, 'i'))).toBeVisible();
    });

    test('should view volunteer details', async ({ authenticatedPage, authToken }) => {
        const { id } = await createTestVolunteer(authenticatedPage, authToken, {
            firstName: 'Detail',
            lastName: 'Volunteer',
            email: 'detail.volunteer@test.com',
        });

        await authenticatedPage.goto(`/volunteers/${id}`);

        await expect(
            authenticatedPage.getByRole('heading', { level: 1, name: /Detail Volunteer/i })
        ).toBeVisible();
        await expect(authenticatedPage.getByText('detail.volunteer@test.com')).toBeVisible();
    });

    test('should search, filter, edit, and delete volunteers from list actions', async ({
        authenticatedPage,
        authToken,
    }) => {
        const suffix = uniqueSuffix();
        const targetFirstName = `Filter${suffix}`;
        const targetLastName = 'Volunteer';
        const targetFullName = `${targetFirstName} ${targetLastName}`;

        const { id: targetVolunteerId } = await createTestVolunteer(authenticatedPage, authToken, {
            firstName: targetFirstName,
            lastName: targetLastName,
            email: `filter.${suffix}@example.com`,
            availabilityStatus: 'limited',
            backgroundCheckStatus: 'pending',
        });

        await createTestVolunteer(authenticatedPage, authToken, {
            firstName: `Other${suffix}`,
            lastName: 'Volunteer',
            email: `other.${suffix}@example.com`,
            availabilityStatus: 'available',
            backgroundCheckStatus: 'approved',
        });

        await authenticatedPage.goto('/volunteers');
        await authenticatedPage.getByRole('textbox', { name: /^search$/i }).fill(targetFirstName);
        await authenticatedPage.getByRole('combobox', { name: /^availability$/i }).selectOption(
            'limited'
        );
        await authenticatedPage
            .getByRole('combobox', { name: /^background check$/i })
            .selectOption('pending');
        await authenticatedPage.getByRole('button', { name: /^apply$/i }).click();

        const targetRow = await waitForVolunteerRow(authenticatedPage, targetFullName);
        await expect(
            authenticatedPage.locator('tr', { hasText: `Other${suffix} Volunteer` })
        ).toHaveCount(0);

        await targetRow.getByRole('button', { name: /^edit$/i }).click();
        await expect(authenticatedPage).toHaveURL(
            new RegExp(`/volunteers/${targetVolunteerId}/edit$`)
        );

        const availabilityStatusSelect = authenticatedPage.getByLabel(/availability status/i);
        await expect(availabilityStatusSelect).toHaveValue('limited');
        await availabilityStatusSelect.selectOption('available');
        const updateVolunteerResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.request().method() === 'PUT' &&
                response.url().includes(`/api/v2/volunteers/${targetVolunteerId}`)
        );
        await authenticatedPage.getByRole('button', { name: /update volunteer/i }).click();
        const updateResponse = await updateVolunteerResponse;
        if (!updateResponse.ok()) {
            throw new Error(
                `Volunteer update failed (${updateResponse.status()}): ${await updateResponse.text()}`
            );
        }

        await expect(authenticatedPage).toHaveURL(new RegExp(`/volunteers/${targetVolunteerId}$`));
        await expect(authenticatedPage.getByText(/available/i).first()).toBeVisible();

        await authenticatedPage.goto(`/volunteers?search=${encodeURIComponent(targetFirstName)}`);
        const deleteRow = await waitForVolunteerRow(authenticatedPage, targetFullName);
        const deleteVolunteerResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.request().method() === 'DELETE' &&
                response.url().includes(`/api/v2/volunteers/${targetVolunteerId}`) &&
                response.ok()
        );
        await deleteRow.getByRole('button', { name: /^delete$/i }).click();

        const confirmDeleteDialog = authenticatedPage
            .locator('.fixed.inset-0')
            .filter({ hasText: new RegExp(`Delete\\s+${targetFullName}`, 'i') });
        await expect(confirmDeleteDialog).toBeVisible({ timeout: 10000 });
        await confirmDeleteDialog.getByRole('button', { name: /^delete$/i }).click();
        await deleteVolunteerResponse;

        await expect(authenticatedPage.locator('tr', { hasText: targetFullName })).toHaveCount(0);
    });

    test('should exercise assignment, calendar, and time tracker volunteer tabs', async ({
        authenticatedPage,
        authToken,
    }) => {
        const suffix = uniqueSuffix();
        const eventName = `Volunteer Shift ${suffix}`;
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 1, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        const { id: volunteerId } = await createTestVolunteer(authenticatedPage, authToken, {
            firstName: `Tabs${suffix}`,
            lastName: 'Volunteer',
            email: `tabs.${suffix}@example.com`,
        });
        const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
            name: eventName,
            startDate: startTime.toISOString(),
            endDate: endTime.toISOString(),
        });
        await createTestVolunteerAssignment(authenticatedPage, authToken, {
            volunteerId,
            eventId,
            assignmentType: 'event',
            role: 'Greeter',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes: 'Front desk coverage',
        });

        await authenticatedPage.goto(`/volunteers/${volunteerId}`);

        await authenticatedPage.getByRole('button', { name: /assignments/i }).click();
        await expect(authenticatedPage.getByText(eventName)).toBeVisible();
        await expect(
            authenticatedPage.getByRole('button', { name: /\+ new assignment/i })
        ).toBeVisible();

        await authenticatedPage.getByRole('button', { name: /^calendar$/i }).click();
        await authenticatedPage.getByText(eventName).first().click();
        await expect(authenticatedPage.getByText(/assignments for/i)).toBeVisible();
        await expect(
            authenticatedPage.getByRole('heading', { name: eventName, exact: true })
        ).toBeVisible();
        await expect(authenticatedPage.getByText(/role:\s*greeter/i)).toBeVisible();

        await authenticatedPage.getByRole('button', { name: /time tracker/i }).click();
        const timeTrackerCard = authenticatedPage.locator('div', { hasText: eventName }).first();
        await expect(timeTrackerCard.getByRole('button', { name: /start timer/i })).toBeVisible();

        await timeTrackerCard.getByRole('button', { name: /start timer/i }).click();
        await expect(authenticatedPage.getByText(/timer running/i)).toBeVisible();

        const stopTimerResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.request().method() === 'PUT' &&
                response.url().includes('/api/v2/volunteers/assignments/') &&
                response.ok()
        );
        await authenticatedPage.getByRole('button', { name: /^stop$/i }).click();
        await stopTimerResponse;
        await expect(authenticatedPage.getByText(/timer running/i)).toHaveCount(0);

        const logHoursResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.request().method() === 'PUT' &&
                response.url().includes('/api/v2/volunteers/assignments/') &&
                response.ok()
        );
        await timeTrackerCard.getByPlaceholder('0.0').fill('1.5');
        await timeTrackerCard.getByRole('button', { name: /^log$/i }).click();
        await logHoursResponse;

        await expect
            .poll(
                async () =>
                    timeTrackerCard.getByText(/hours logged:\s*1\.5/i).count(),
                { timeout: 15000, intervals: [500, 1000, 1500] }
            )
            .toBeGreaterThan(0);
    });
});
