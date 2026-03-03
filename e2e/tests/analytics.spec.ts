import { test, expect } from '../fixtures/auth.fixture';

test.describe('Analytics Module', () => {
    test('should load analytics dashboard', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/analytics');

        // Check for main heading
        await expect(authenticatedPage.getByRole('heading', { name: /analytics|dashboard/i }).first()).toBeVisible();

        // The shared analytics shell must always expose filters and then either KPI content or an explicit empty state.
        await expect(authenticatedPage.getByRole('heading', { name: /^date filters$/i })).toBeVisible();
        await expect
            .poll(
                async () => {
                    const loadingState = await authenticatedPage.getByText(/loading analytics/i).count();
                    const kpiSection = await authenticatedPage.getByText(/key performance indicators/i).count();
                    const emptyState = await authenticatedPage.getByText(/no analytics data available/i).count();
                    const errorState = await authenticatedPage.getByRole('button', { name: /retry analytics/i }).count();
                    return loadingState + kpiSection + emptyState + errorState;
                },
                { timeout: 10000, intervals: [500, 1000, 1500] }
            )
            .toBeGreaterThan(0);
    });

    test('should navigate to report builder', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/reports/builder');

        await expect(authenticatedPage.getByRole('heading', { name: /report builder/i })).toBeVisible();
        await expect(authenticatedPage.getByText(/data source|entity|select/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to saved reports', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/reports/saved');

        await expect(authenticatedPage.getByRole('heading', { name: /saved reports/i })).toBeVisible();
        // Saved reports list should render entries or a clear empty-state message.
        await expect
            .poll(
                async () => {
                    const loadAndRunCount = await authenticatedPage
                        .getByRole('button', { name: /load\s*&\s*run/i })
                        .count();
                    const emptyStateCount = await authenticatedPage
                        .getByText(/no saved reports|no reports found/i)
                        .count();
                    return loadAndRunCount + emptyStateCount;
                },
                { timeout: 10000, intervals: [500, 1000, 1500] }
            )
            .toBeGreaterThan(0);
    });

    test('should navigate to report templates', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/reports/templates');

        await expect(authenticatedPage.getByRole('heading', { name: /report templates/i })).toBeVisible();
        await expect(authenticatedPage.getByText(/filter by category/i)).toBeVisible();
    });

    test('should navigate to custom dashboard', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/custom');

        // Check for "Customize Dashboard" button which should be present
        await expect(authenticatedPage.getByRole('button', { name: /customize dashboard/i })).toBeVisible({ timeout: 10000 });
    });
});
