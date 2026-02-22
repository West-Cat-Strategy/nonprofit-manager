/**
 * Theme and Design System E2E Tests
 * Verifies theme selection, persistence, and dark mode responsiveness
 */

import '../helpers/testEnv';
import { test, expect, type Page } from '@playwright/test';
import { login, ensureAdminLoginViaAPI } from '../helpers/auth';

const getCreds = () => ({
    email: process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com',
    password: process.env.ADMIN_USER_PASSWORD?.trim() || 'Admin123!@#',
});
const THEMES = ['neobrutalist', 'sea-breeze', 'corporate', 'clean-modern', 'glass', 'high-contrast'] as const;
const COLOR_SCHEMES = ['light', 'dark'] as const;

type Rgba = { r: number; g: number; b: number; a: number };

function parseCssColor(input: string): Rgba {
  const value = input.trim();
  const rgba = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/i);
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: Number(rgba[4]),
    };
  }

  const rgb = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: 1,
    };
  }

  throw new Error(`Unsupported CSS color format: ${input}`);
}

function luminance(color: Rgba): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: Rgba, background: Rgba): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function applyThemeAndMode(
  page: Page,
  theme: string,
  mode: 'light' | 'dark'
): Promise<void> {
  await page.evaluate(
    ({ nextTheme, nextMode }) => {
      localStorage.setItem('app-theme', nextTheme);
      localStorage.setItem('app-color-scheme', nextMode);
    },
    { nextTheme: theme, nextMode: mode }
  );
  await page.reload();
}

test.describe('Theming and Design System', () => {
    test.beforeEach(async ({ page }) => {
        await ensureAdminLoginViaAPI(page, {
            firstName: 'Admin',
            lastName: 'User',
        });
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

    test('should keep user dropdown opaque and readable across all themes in light/dark', async ({ page }) => {
        test.setTimeout(120000);
        await page.goto('/dashboard');
        const userMenuButton = page.locator('button[aria-label="User menu"]').first();

        for (const theme of THEMES) {
            for (const scheme of COLOR_SCHEMES) {
                await applyThemeAndMode(page, theme, scheme);
                await page.goto('/dashboard');
                await userMenuButton.click();

                const menuPanel = page.locator('div.menu-surface-opaque:has(a[href="/settings/user"])').first();
                await expect(menuPanel).toBeVisible();

                const menuBgRaw = await menuPanel.evaluate((el) => getComputedStyle(el).backgroundColor);
                const menuBg = parseCssColor(menuBgRaw);
                expect(menuBg.a).toBe(1);

                const itemColorRaw = await menuPanel
                    .locator('a[href="/settings/user"]')
                    .first()
                    .evaluate((el) => getComputedStyle(el).color);
                const itemColor = parseCssColor(itemColorRaw);
                const ratio = contrastRatio(itemColor, menuBg);
                expect(ratio, `contrast failed for theme=${theme} scheme=${scheme}`).toBeGreaterThanOrEqual(4.5);

                await page.keyboard.press('Escape');
            }
        }
    });

    test('should keep theme picker dropdown opaque and readable in dark mode', async ({ page }) => {
        await page.goto('/dashboard');
        await applyThemeAndMode(page, 'glass', 'dark');
        await page.goto('/dashboard');

        const themeMenuButton = page.locator('button[aria-label="Theme settings"]').first();
        await expect(themeMenuButton).toBeVisible();
        await themeMenuButton.click();

        const panel = page.locator('div.menu-surface-opaque:has-text("Switch to Light")').first();
        await expect(panel).toBeVisible();

        const panelBgRaw = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
        const panelBg = parseCssColor(panelBgRaw);
        expect(panelBg.a).toBe(1);

        const menuTextRaw = await panel
            .locator('p:has-text("Theme")')
            .first()
            .evaluate((el) => getComputedStyle(el).color);
        const menuText = parseCssColor(menuTextRaw);
        const ratio = contrastRatio(menuText, panelBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('should keep People page filter options readable across themes and modes', async ({ page }) => {
        test.setTimeout(120000);
        await page.goto('/contacts');

        for (const theme of THEMES) {
            for (const scheme of COLOR_SCHEMES) {
                await applyThemeAndMode(page, theme, scheme);
                await page.goto('/contacts');

                const roleSelect = page.locator('select').first();
                await expect(roleSelect).toBeVisible();

                const selectBgRaw = await roleSelect.evaluate((el) => {
                    const backgroundColor = getComputedStyle(el).backgroundColor;
                    if (backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
                        return backgroundColor;
                    }

                    const probe = document.createElement('div');
                    probe.style.backgroundColor = 'var(--app-surface-elevated)';
                    document.body.appendChild(probe);
                    const fallback = getComputedStyle(probe).backgroundColor;
                    probe.remove();
                    return fallback;
                });
                const selectColorRaw = await roleSelect.evaluate((el) => getComputedStyle(el).color);
                const selectBg = parseCssColor(selectBgRaw);
                const selectColor = parseCssColor(selectColorRaw);
                expect(
                    contrastRatio(selectColor, selectBg),
                    `select contrast failed for theme=${theme} scheme=${scheme}`
                ).toBeGreaterThanOrEqual(4.5);
            }
        }
    });
});
