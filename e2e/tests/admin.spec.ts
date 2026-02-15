import { test, expect } from '../fixtures/auth.fixture';

test.describe('Admin & Settings Module', () => {
    test('should load user settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/user');

        await expect(authenticatedPage.getByRole('heading', { name: /user settings|profile/i })).toBeVisible();
        await expect(authenticatedPage.getByLabel(/First Name|first name/i)).toBeVisible({ timeout: 10000 });
    });

    // Admin only routes - skipped for standard user tests
    // test('should load admin settings', async ({ authenticatedPage }) => {
    //     await authenticatedPage.goto('/settings/admin');
    //     await expect(authenticatedPage.getByRole('heading', { name: /admin settings|organization/i })).toBeVisible();
    // });

    test('should load API settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/api');

        await expect(authenticatedPage.getByRole('heading', { name: /api settings/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /generate|create/i })).toBeVisible({ timeout: 10000 });
    });

    test('should load navigation settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/navigation');

        await expect(authenticatedPage.getByRole('heading', { name: /navigation settings|menu|navigation/i }).first()).toBeVisible({ timeout: 10000 });
    });

    // Admin only routes - skipped for standard user tests
    // test('should load backup settings', async ({ authenticatedPage }) => {
    //     await authenticatedPage.goto('/settings/backup');
    //     await expect(authenticatedPage.getByRole('heading', { name: /backup|data management/i })).toBeVisible();
    // });

    test('should load email marketing settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/email-marketing');

        await expect(authenticatedPage.getByRole('heading', { name: /email marketing|mailchimp/i })).toBeVisible();
    });
});
