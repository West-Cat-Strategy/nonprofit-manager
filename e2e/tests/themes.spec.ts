/**
 * Theme and Design System E2E Tests
 * Verifies theme selection, persistence, and dark mode responsiveness
 */

import '../helpers/testEnv';
import { test, expect } from '@playwright/test';
import { login, ensureLoginViaAPI } from '../helpers/auth';
import { getSharedTestUser } from '../helpers/testUser';

const getCreds = () => getSharedTestUser();

test.describe('Theming and Design System', () => {
    test.beforeEach(async ({ page }) => {
        const { email, password } = getCreds();
        await ensureLoginViaAPI(page, email, password);
        await page.goto('/settings/user');

        // Wait for the theme selector to be visible using CSS selector
        const selector = page.locator('[aria-label="Select interface theme"]');
        await selector.first().waitFor({ state: 'visible', timeout: 5000 });

        // Ensure at least one is visible
        const count = await selector.count();
        if (count > 0) {
            await expect(selector.first()).toBeVisible();
        } else {
            throw new Error('No theme selector found');
        }
    });

    test('should switch themes correctly', async ({ page }) => {
        // Select "Sea Breeze" theme
        const seaBreezeButton = page.locator('[aria-label="Sea Breeze theme"]').first();
        await seaBreezeButton.click();

        // Verify Sea Breeze class on body
        await expect(page.locator('body')).toHaveClass(/theme-sea-breeze/);

        // Verify persistence in localStorage
        const savedTheme = await page.evaluate(() => localStorage.getItem('app-theme'));
        expect(savedTheme).toBe('sea-breeze');

        // Select "Corporate" theme
        const corporateButton = page.locator('[aria-label="Corporate theme"]').first();
        await corporateButton.click();
        await expect(page.locator('body')).toHaveClass(/theme-corporate/);

        const savedTheme2 = await page.evaluate(() => localStorage.getItem('app-theme'));
        expect(savedTheme2).toBe('corporate');
    });

    test('should toggle dark mode correctly', async ({ page }) => {
        const darkModeButton = page.locator('[aria-label="Dark mode"]').first();
        await darkModeButton.click();

        // Verify dark class on body
        await expect(page.locator('body')).toHaveClass(/dark/);

        // Verify persistence
        const savedScheme = await page.evaluate(() => localStorage.getItem('app-color-scheme'));
        expect(savedScheme).toBe('dark');

        // Switch back to light mode
        const lightModeButton = page.locator('[aria-label="Light mode"]').first();
        await lightModeButton.click();
        await expect(page.locator('body')).not.toHaveClass(/dark/);

        const savedScheme2 = await page.evaluate(() => localStorage.getItem('app-color-scheme'));
        expect(savedScheme2).toBe('light');
    });

    test('should persist theme across navigation and reload', async ({ page }) => {
        // Set theme to Glassmorphism
        await page.locator('[aria-label="Glassmorphism theme"]').first().click();
        await expect(page.locator('body')).toHaveClass(/theme-glass/);

        // Navigate to Dashboard
        await page.goto('/dashboard');
        await expect(page.locator('body')).toHaveClass(/theme-glass/);

        // Reload page
        await page.reload();
        await expect(page.locator('body')).toHaveClass(/theme-glass/);
    });

    test.use({ viewport: { width: 1440, height: 900 } });

    test.skip('should handle quick theme cycling in navigation', async ({ page }) => {
        // Ensure we are on a page that has the navigation bar (e.g. /settings/api uses Layout.tsx)
        await page.goto('/settings/api');

        const themeToggle = page.locator('[aria-label="Theme settings"]').first();
        await expect(themeToggle).toBeVisible();

        // Store current theme
        const initialTheme = await page.evaluate(() => document.body.className);

        // Double-click to cycle
        await themeToggle.dblclick();

        // Verify class changed
        const newTheme = await page.evaluate(() => document.body.className);
        expect(newTheme).not.toBe(initialTheme);
    });

    test('should apply high contrast theme for accessibility', async ({ page }) => {
        // Force Light Mode to ensure consistent assertions
        await page.locator('[aria-label="Light mode"]').first().click();

        const highContrastButton = page.locator('[aria-label="High Contrast theme"]').first();
        await highContrastButton.click();

        await expect(page.locator('body')).toHaveClass(/theme-high-contrast/);
    });
});
