import { test, expect } from '../fixtures/auth.fixture';
import { createTestVolunteer, clearDatabase } from '../helpers/database';

test.describe('Volunteers Module', () => {
    test.beforeEach(async ({ authenticatedPage, authToken }) => {
        await clearDatabase(authenticatedPage, authToken);
    });

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

        await authenticatedPage.goto('/volunteers/new');

        const contactSelect = authenticatedPage.getByLabel(/select contact/i);
        await expect
            .poll(async () => await contactSelect.locator('option').count())
            .toBeGreaterThan(1);
        await contactSelect.selectOption({ index: 1 });

        await authenticatedPage.getByRole('button', { name: /create volunteer/i }).click();

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
});
