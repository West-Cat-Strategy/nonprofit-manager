/**
 * Theme and Design System E2E Tests
 * Verifies theme selection, persistence, and dark mode responsiveness
 */

import '../helpers/testEnv';
import { test, expect, type Page } from '@playwright/test';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';

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
        await ensureEffectiveAdminLoginViaAPI(page, {
            firstName: 'Admin',
            lastName: 'User',
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    });

    test('should switch themes correctly', async ({ page }) => {
        // Apply "Sea Breeze" theme
        await applyThemeAndMode(page, 'sea-breeze', 'light');

        // Verify Sea Breeze class on body
        await expect(page.locator('body')).toHaveClass(/theme-sea-breeze/);

        // Verify persistence in localStorage
        const savedTheme = await page.evaluate(() => localStorage.getItem('app-theme'));
        expect(savedTheme).toBe('sea-breeze');

        // Apply "Corporate" theme
        await applyThemeAndMode(page, 'corporate', 'light');
        await expect(page.locator('body')).toHaveClass(/theme-corporate/);

        const savedTheme2 = await page.evaluate(() => localStorage.getItem('app-theme'));
        expect(savedTheme2).toBe('corporate');
    });

    test('should toggle dark mode correctly', async ({ page }) => {
        await applyThemeAndMode(page, 'neobrutalist', 'dark');

        // Verify dark class on body
        await expect(page.locator('body')).toHaveClass(/dark/);

        // Verify persistence
        const savedScheme = await page.evaluate(() => localStorage.getItem('app-color-scheme'));
        expect(savedScheme).toBe('dark');

        // Switch back to light mode
        await applyThemeAndMode(page, 'neobrutalist', 'light');
        await expect(page.locator('body')).not.toHaveClass(/dark/);

        const savedScheme2 = await page.evaluate(() => localStorage.getItem('app-color-scheme'));
        expect(savedScheme2).toBe('light');
    });

    test('should persist theme across navigation and reload', async ({ page }) => {
        // Set theme to Glassmorphism
        await applyThemeAndMode(page, 'glass', 'light');
        await expect(page.locator('body')).toHaveClass(/theme-glass/);

        // Navigate to Dashboard
        await page.goto('/dashboard');
        await expect(page.locator('body')).toHaveClass(/theme-glass/);

        // Reload page
        await page.reload();
        await expect(page.locator('body')).toHaveClass(/theme-glass/);
    });

    test.use({ viewport: { width: 1440, height: 900 } });

    test('should handle quick theme cycling in navigation', async ({ page }) => {
        const initialTheme = 'sea-breeze';
        const nextTheme = 'corporate';

        await applyThemeAndMode(page, initialTheme, 'light');
        await expect(page.locator('body')).toHaveClass(new RegExp(`theme-${initialTheme}`), {
            timeout: 15000,
        });

        await applyThemeAndMode(page, nextTheme, 'light');

        await expect.poll(
            async () => page.evaluate(() => localStorage.getItem('app-theme') || ''),
            { timeout: 15000 }
        ).toBe(nextTheme);

        await expect.poll(
            async () => (await page.locator('body').getAttribute('class')) || '',
            { timeout: 15000 }
        ).toContain(`theme-${nextTheme}`);
    });

    test('should apply high contrast theme for accessibility', async ({ page }) => {
        await applyThemeAndMode(page, 'high-contrast', 'light');

        await expect(page.locator('body')).toHaveClass(/theme-high-contrast/);
    });

    test('should keep user dropdown opaque and readable', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);
        const userMenuButton = page.getByRole('button', { name: /user menu/i }).first();
        await expect(userMenuButton).toBeVisible({ timeout: 30000 });
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
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('should keep theme picker dropdown opaque and readable in dark mode', async ({ page }) => {
        await page.goto('/dashboard');
        await applyThemeAndMode(page, 'glass', 'dark');
        await page.goto('/dashboard');
        await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);

        const themeMenuButton = page.getByRole('button', { name: /theme settings/i }).first();
        await expect(themeMenuButton).toBeVisible({ timeout: 30000 });
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

    test('should keep People page filter options readable across representative themes and modes', async ({ page }) => {
        test.setTimeout(180000);
        await page.goto('/contacts');
        const samples: Array<{ theme: (typeof THEMES)[number]; scheme: (typeof COLOR_SCHEMES)[number] }> = [
            { theme: 'glass', scheme: 'dark' },
            { theme: 'high-contrast', scheme: 'light' },
        ];

        for (const { theme, scheme } of samples) {
            await applyThemeAndMode(page, theme, scheme);
            await page.goto('/contacts');
            await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);

            const roleSelect = page.locator('select').first();
            await expect(roleSelect).toBeVisible({ timeout: 30000 });

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
    });

    test('should apply redesigned app tokens across every theme and mode pair', async ({ page }) => {
        test.setTimeout(240000);

        for (const theme of THEMES) {
            for (const scheme of COLOR_SCHEMES) {
                await applyThemeAndMode(page, theme, scheme);
                await page.goto('/dashboard');
                await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);

                await expect.poll(
                    async () => page.evaluate(() => localStorage.getItem('app-theme') || ''),
                    { timeout: 10000 }
                ).toBe(theme);
                await expect.poll(
                    async () => page.evaluate(() => localStorage.getItem('app-color-scheme') || ''),
                    { timeout: 10000 }
                ).toBe(scheme);

                const activeThemeClasses = await page.evaluate(() =>
                    Array.from(document.body.classList).filter(
                        (className) => className.startsWith('theme-') && className !== 'theme-transitioning'
                    )
                );

                if (theme === 'neobrutalist') {
                    expect(activeThemeClasses).toEqual([]);
                } else {
                    expect(activeThemeClasses).toContain(`theme-${theme}`);
                }

                const tokenSnapshot = await page.evaluate(() => {
                    const probe = document.createElement('div');
                    probe.style.color = 'var(--app-text)';
                    probe.style.backgroundColor = 'var(--app-bg)';
                    probe.style.borderColor = 'var(--app-border)';
                    document.body.appendChild(probe);

                    const styles = getComputedStyle(probe);
                    const rootStyles = getComputedStyle(document.body);
                    const payload = {
                        color: styles.color,
                        backgroundColor: styles.backgroundColor,
                        borderColor: styles.borderColor,
                        focusRing: rootStyles.getPropertyValue('--focus-ring').trim(),
                    };

                    probe.remove();
                    return payload;
                });

                const foreground = parseCssColor(tokenSnapshot.color);
                const background = parseCssColor(tokenSnapshot.backgroundColor);
                expect(
                    contrastRatio(foreground, background),
                    `theme=${theme} scheme=${scheme} failed contrast ratio`
                ).toBeGreaterThanOrEqual(4.5);
                expect(tokenSnapshot.borderColor).not.toBe('');
                expect(tokenSnapshot.focusRing).not.toBe('');
            }
        }
    });
});
