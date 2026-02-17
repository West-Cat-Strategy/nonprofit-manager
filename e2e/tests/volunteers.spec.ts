import { test, expect } from '../fixtures/auth.fixture';
import { createTestContact, clearDatabase } from '../helpers/database';

test.describe('Volunteers Module', () => {
    test.beforeEach(async ({ authenticatedPage, authToken }) => {
        await clearDatabase(authenticatedPage, authToken);
    });

    test('should display volunteers list page', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/volunteers');

        await expect(authenticatedPage.getByRole('heading', { name: /volunteers/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /new volunteer/i })).toBeVisible();
    });

    test('should create a new volunteer via UI', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/volunteers/new');

        // Fill form
        await authenticatedPage.getByLabel(/first name/i).fill('Test');
        await authenticatedPage.getByLabel(/last name/i).fill('Volunteer');
        await authenticatedPage.getByLabel(/email/i).fill('volunteer@test.com');
        await authenticatedPage.getByLabel(/phone/i).fill('555-0199');

        await authenticatedPage.getByRole('button', { name: /save|create/i }).click();

        // Should display success or redirect
        await expect(authenticatedPage.getByRole('heading', { name: /Test Volunteer/i })).toBeVisible({ timeout: 10000 });
    });

    test('should view volunteer details', async ({ authenticatedPage, authToken }) => {
        const { id } = await createTestContact(authenticatedPage, authToken, {
            firstName: 'Detail',
            lastName: 'Volunteer',
            email: 'detail.volunteer@test.com',
            contactType: 'volunteer'
        });

        await authenticatedPage.goto(`/volunteers/${id}`);

        await expect(authenticatedPage.getByRole('heading', { name: /Detail Volunteer/i })).toBeVisible();
        await expect(authenticatedPage.getByText('detail.volunteer@test.com')).toBeVisible();
    });
});
