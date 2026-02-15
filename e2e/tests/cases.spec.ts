import { test, expect } from '../fixtures/auth.fixture';
import { createTestContact, clearDatabase } from '../helpers/database';

test.describe('Cases Module', () => {
    test.beforeEach(async ({ authenticatedPage, authToken }) => {
        await clearDatabase(authenticatedPage, authToken);
    });

    test('should display cases list page', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/cases');

        await expect(authenticatedPage.getByRole('heading', { name: /cases/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /new case/i })).toBeVisible();
    });

    test('should create a new case via UI', async ({ authenticatedPage, authToken }) => {
        // Create a contact to associate with the case
        const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
            firstName: 'Case',
            lastName: 'Subject',
            email: 'case.subject@test.com'
        });

        await authenticatedPage.goto('/cases/new');

        // Fill form
        await authenticatedPage.getByLabel(/title|subject/i).fill('Test Case 123');
        await authenticatedPage.getByLabel(/description/i).fill('This is a test case description.');

        // Select status if available
        const statusSelect = authenticatedPage.locator('select[name="status"]');
        if (await statusSelect.isVisible()) {
            await statusSelect.selectOption('open');
        }

        // Select priority if available
        const prioritySelect = authenticatedPage.locator('select[name="priority"]');
        if (await prioritySelect.isVisible()) {
            await prioritySelect.selectOption('high');
        }

        // Select client/contact
        // This might be a searchable dropdown or a select
        // Assuming standard select for now based on other tests, or we might need to search
        // Using a generic approach for now
        const clientSelect = authenticatedPage.locator('select[name="contact_id"], select[name="clientId"]');
        if (await clientSelect.isVisible()) {
            await clientSelect.selectOption(contactId);
        }

        await authenticatedPage.getByRole('button', { name: /save|create/i }).click();

        // Should display success or redirect
        await expect(authenticatedPage.getByRole('heading', { name: /Test Case 123/i })).toBeVisible({ timeout: 10000 });
    });
});
