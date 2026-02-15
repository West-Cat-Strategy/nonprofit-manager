import { test, expect } from '../fixtures/auth.fixture';

test.describe('Analytics Module', () => {
    test('should load analytics dashboard', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/analytics');

        // Check for main heading
        await expect(authenticatedPage.getByRole('heading', { name: /analytics|dashboard/i }).first()).toBeVisible();

        // Check for key metrics (assuming some default placeholder text or structure exists)
        // Adjust selectors based on actual content
        await expect(authenticatedPage.locator('.recharts-surface').first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to report builder', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/reports/builder');

        await expect(authenticatedPage.getByRole('heading', { name: /report builder/i })).toBeVisible();
        await expect(authenticatedPage.getByText(/data source/i)).toBeVisible();
    });

    test('should navigate to saved reports', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/reports/saved');

        await expect(authenticatedPage.getByRole('heading', { name: /saved reports/i })).toBeVisible();
        // Should show a list or "no reports" message
        await expect(authenticatedPage.locator('table, .list-group, p:has-text("No reports")').first()).toBeVisible();
    });

    test('should navigate to custom dashboard', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/custom');

        // Check for "Customize Dashboard" button which should be present
        await expect(authenticatedPage.getByRole('button', { name: /customize dashboard/i })).toBeVisible({ timeout: 10000 });
    });
});
