import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const waitForAnalyticsState = async (page: Page) => {
    await expect
        .poll(
            async () => {
                const loadingState = await page.getByText(/loading analytics/i).count();
                const kpiSection = await page
                    .getByText(/key performance indicators/i)
                    .count();
                const emptyState = await page
                    .getByText(/no analytics data available/i)
                    .count();
                const errorState = await page
                    .getByRole('button', { name: /retry analytics/i })
                    .count();
                return loadingState + kpiSection + emptyState + errorState;
            },
            { timeout: 10000, intervals: [500, 1000, 1500] }
        )
        .toBeGreaterThan(0);
};

test.describe('Analytics Module', () => {
    test('should load analytics dashboard', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/analytics');

        // Check for main heading
        await expect(authenticatedPage.getByRole('heading', { name: /analytics|dashboard/i }).first()).toBeVisible();

        // The shared analytics shell must always expose filters and then either KPI content or an explicit empty state.
        await expect(authenticatedPage.getByRole('heading', { name: /^date filters$/i })).toBeVisible();
        await waitForAnalyticsState(authenticatedPage);
    });

    test('should apply and clear analytics filters while preserving operable states', async ({
        authenticatedPage,
    }) => {
        await authenticatedPage.goto('/analytics');
        await waitForAnalyticsState(authenticatedPage);

        await authenticatedPage.getByLabel(/start date/i).fill('2025-01-01');
        await authenticatedPage.getByLabel(/end date/i).fill('2025-12-31');
        await authenticatedPage.getByRole('button', { name: /apply filters/i }).click();

        await expect(authenticatedPage.getByLabel(/start date/i)).toHaveValue('2025-01-01');
        await expect(authenticatedPage.getByLabel(/end date/i)).toHaveValue('2025-12-31');
        await waitForAnalyticsState(authenticatedPage);

        const retryButton = authenticatedPage.getByRole('button', { name: /retry analytics/i });
        if (await retryButton.isVisible().catch(() => false)) {
            await retryButton.click();
            await waitForAnalyticsState(authenticatedPage);
        } else {
            await expect(
                authenticatedPage
                    .getByText(/key performance indicators|no analytics data available/i)
                    .first()
            ).toBeVisible();
        }

        await authenticatedPage.getByRole('button', { name: /^clear$/i }).click();
        await expect(authenticatedPage.getByLabel(/start date/i)).toHaveValue('');
        await expect(authenticatedPage.getByLabel(/end date/i)).toHaveValue('');
        await waitForAnalyticsState(authenticatedPage);
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

        const filterSummary = authenticatedPage.getByText(/filter templates/i);
        await expect(authenticatedPage.getByRole('heading', { name: /report templates/i })).toBeVisible();
        await expect(filterSummary).toBeVisible();
        await filterSummary.click();
        await expect(authenticatedPage.getByText(/^category$/i)).toBeVisible();
    });

    test('should navigate to custom dashboard', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/custom');

        await expect(authenticatedPage.getByRole('button', { name: /edit layout/i })).toBeVisible({
            timeout: 10000,
        });
    });

    test('custom dashboard refresh controls and responsive editor stay operable', async ({ authenticatedPage }) => {
        await authenticatedPage.setViewportSize({ width: 1280, height: 900 });
        await authenticatedPage.goto('/dashboard/custom');

        await expect(authenticatedPage.getByRole('button', { name: /edit layout/i })).toBeVisible({
            timeout: 10000,
        });
        await expect(authenticatedPage.getByRole('region', { name: /dashboard data refresh/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /refresh data/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /clear cache/i })).toBeVisible();
        await expect(authenticatedPage.getByTestId('custom-dashboard-grid')).toBeVisible();
        await expect(authenticatedPage.getByTestId('custom-dashboard-refresh-state')).toHaveText(/data ready|refreshing data/i);

        await authenticatedPage.getByRole('button', { name: /refresh data/i }).click();
        await expect(authenticatedPage.getByTestId('custom-dashboard-refresh-state')).toHaveText(/data ready|refreshing data/i);

        await authenticatedPage.getByRole('button', { name: /edit layout/i }).click();
        const firstGridItem = authenticatedPage.getByTestId('custom-dashboard-grid').locator('.react-grid-item').first();
        const firstDragHandle = firstGridItem.locator('.drag-handle').first();
        await expect(firstDragHandle).toBeVisible();

        const dragBox = await firstDragHandle.boundingBox();
        expect(dragBox).toBeTruthy();
        if (dragBox) {
            await authenticatedPage.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
            await authenticatedPage.mouse.down();
            await authenticatedPage.mouse.move(dragBox.x + dragBox.width / 2 + 180, dragBox.y + dragBox.height / 2 + 90, {
                steps: 8,
            });
            await authenticatedPage.mouse.up();
        }

        const resizeHandle = firstGridItem.locator('.react-resizable-handle').first();
        await expect(resizeHandle).toBeVisible();
        const resizeBox = await resizeHandle.boundingBox();
        expect(resizeBox).toBeTruthy();
        if (resizeBox) {
            await authenticatedPage.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
            await authenticatedPage.mouse.down();
            await authenticatedPage.mouse.move(resizeBox.x + resizeBox.width / 2 + 120, resizeBox.y + resizeBox.height / 2 + 80, {
                steps: 8,
            });
            await authenticatedPage.mouse.up();
        }

        await expect(authenticatedPage.getByRole('button', { name: /save layout/i })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: /^cancel$/i }).click();
        await expect(authenticatedPage.getByRole('button', { name: /edit layout/i })).toBeVisible();

        await authenticatedPage.setViewportSize({ width: 390, height: 844 });
        await authenticatedPage.goto('/dashboard/custom');
        await expect(authenticatedPage.getByTestId('custom-dashboard-mobile-stack')).toBeVisible({
            timeout: 10000,
        });
        await expect(authenticatedPage.getByTestId('custom-dashboard-grid')).toHaveCount(0);
        const hasHorizontalOverflow = await authenticatedPage.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalOverflow).toBe(false);
    });
});
