import { test, expect } from '../fixtures/auth.fixture';
import { createTestAccount, createTestContact } from '../helpers/database';

test.describe('Donor Portal', () => {
    // Portal might need specific auth or a different login flow
    // For now, assuming standard auth works or we check the public/protected routes

    test('should display portal login page', async ({ page }) => {
        // Portal login might be different
        await page.goto('/portal/login');
        // If it redirects to main login, that's fine too, but let's check
        // checking for some login form elements
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    // Protected portal routes require portal-specific auth which is different from standard user auth
    // Skipping these for now until we have a portal auth fixture
    test.skip('should access portal dashboard as logged in user', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/portal/dashboard');

        // It might redirect if the user doesn't have portal access, or show the dashboard
        // Let's verify we are on the portal layout
        await expect(authenticatedPage.getByRole('heading', { name: /portal|dashboard/i }).first()).toBeVisible();
    });

    test.skip('should navigate to portal events', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/portal/events');
        await expect(authenticatedPage.getByRole('heading', { name: /events/i })).toBeVisible();
    });

    test.skip('should navigate to portal profile', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/portal/profile');
        await expect(authenticatedPage.getByRole('heading', { name: /profile|account/i })).toBeVisible();
    });
});
