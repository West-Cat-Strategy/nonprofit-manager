import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { getAuthHeaders } from '../helpers/database';
import { waitForPageReady } from '../helpers/routeHelpers';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const DOCS_ROOT = path.resolve(__dirname, '..', '..', 'docs', 'help-center', 'staff');
const SCREENSHOT_ROOT = path.join(DOCS_ROOT, 'assets', 'screenshots', 'dashboard');

type WidgetLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
};

type DashboardWidget = {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  layout: WidgetLayout;
  settings?: Record<string, unknown>;
};

type DashboardConfig = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  widgets: DashboardWidget[];
  layout: WidgetLayout[];
  breakpoints?: Record<string, number>;
  cols?: Record<string, number>;
};

const ensureParentDir = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const writeShot = async (page: Page, filename: string): Promise<string> => {
  const absolutePath = path.join(SCREENSHOT_ROOT, filename);
  ensureParentDir(absolutePath);
  await page.screenshot({
    path: absolutePath,
    animations: 'disabled',
    caret: 'hide',
    fullPage: false,
  });
  return absolutePath;
};

const blurActiveElement = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  });
};

const gotoApp = async (page: Page, route: string): Promise<void> => {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0));
};

const expectNoHorizontalOverflow = async (page: Page, routeLabel: string): Promise<void> => {
  const overflowDelta = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(
    overflowDelta,
    `${routeLabel} overflowed horizontally by ${overflowDelta}px`
  ).toBeLessThanOrEqual(1);
};

const getDefaultDashboard = async (page: Page, token: string): Promise<DashboardConfig> => {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.get(`${API_URL}/api/v2/dashboard/configs/default`, {
    headers,
  });

  expect(
    response.ok(),
    `Default dashboard fetch failed (${response.status()}): ${await response.text()}`
  ).toBeTruthy();

  return (await response.json()) as DashboardConfig;
};

const updateDashboard = async (
  page: Page,
  token: string,
  id: string,
  config: Partial<DashboardConfig>
): Promise<void> => {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.put(`${API_URL}/api/v2/dashboard/configs/${id}`, {
    headers,
    data: config,
  });

  expect(
    response.ok(),
    `Dashboard update failed (${response.status()}): ${await response.text()}`
  ).toBeTruthy();
};

test.describe.serial('dashboard release polish', () => {
  test.setTimeout(10 * 60 * 1000);

  test('refreshes dashboard screenshots and verifies desktop dashboard controls', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 1200 });

    await ensureEffectiveAdminLoginViaAPI(page);

    await gotoApp(page, '/dashboard?panel=settings');
    await waitForPageReady(page, {
      url: /\/dashboard\?panel=settings$/,
      selectors: [
        'h1:has-text("Workbench Overview")',
        'button:has-text("Create Intake")',
        'a:has-text("Manage Navigation"):visible',
        'button:has-text("Close View Settings")',
        'a:has-text("Customize Layout"):visible',
        'section[aria-label="Dashboard view settings"]',
      ],
      timeoutMs: 30_000,
    });

    const createIntake = page.getByRole('button', { name: /create intake/i }).first();
    const closeViewSettings = page.getByRole('button', { name: /close view settings/i }).first();
    await createIntake.focus();
    await expect(createIntake).toBeFocused();
    await closeViewSettings.focus();
    await expect(closeViewSettings).toBeFocused();
    await closeViewSettings.click();

    await waitForPageReady(page, {
      url: /\/dashboard(?:\?|$)/,
      selectors: [
        'button:has-text("Customize View")',
        'a:has-text("Customize Layout"):visible',
        'h2:has-text("Focus Queue")',
        'h2:has-text("My Work")',
        'h2:has-text("Pinned Shortcuts")',
      ],
      timeoutMs: 30_000,
    });

    await expectNoHorizontalOverflow(page, '/dashboard desktop');
    await blurActiveElement(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_ROOT, 'dashboard-overview.png'),
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
    });

    await gotoApp(page, '/dashboard/custom');
      await waitForPageReady(page, {
        selectors: [
          'a:has-text("Back to Workbench"):visible',
          'a:has-text("View Settings"):visible',
          'button:has-text("Edit Layout")',
        ],
        timeoutMs: 30_000,
    });

    await page.getByRole('button', { name: /edit layout/i }).click();
    await waitForPageReady(page, {
      selectors: [
        'button:has-text("Add Widget")',
        'button:has-text("Reset to Default")',
        'button:has-text("Save Layout")',
      ],
      timeoutMs: 30_000,
    });

    const addWidget = page.getByRole('button', { name: /add widget/i }).first();
    const saveLayout = page.getByRole('button', { name: /save layout/i }).first();
    await addWidget.focus();
    await expect(addWidget).toBeFocused();
    await saveLayout.focus();
    await expect(saveLayout).toBeFocused();

    await expectNoHorizontalOverflow(page, '/dashboard/custom desktop');
    await blurActiveElement(page);
    await writeShot(page, 'custom-dashboard-editor.png');
  });

  test('shows legacy widget fallback cards in the custom editor', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 1200 });

    const adminSession = await ensureEffectiveAdminLoginViaAPI(page);
    const originalDashboard = await getDefaultDashboard(page, adminSession.token);

    const legacyWidgetId = 'widget-legacy-recent-contacts';
    const maxY = originalDashboard.layout.reduce(
      (highest, item) => Math.max(highest, item.y + item.h),
      0
    );
    const legacyLayout: WidgetLayout = {
      i: legacyWidgetId,
      x: 0,
      y: maxY,
      w: 4,
      h: 3,
      minW: 3,
      minH: 2,
    };
    const legacyWidget: DashboardWidget = {
      id: legacyWidgetId,
      type: 'recent_contacts',
      title: 'Recent Contacts',
      enabled: true,
      layout: legacyLayout,
    };

    await updateDashboard(page, adminSession.token, originalDashboard.id, {
      widgets: [
        ...originalDashboard.widgets.filter((widget) => widget.id !== legacyWidgetId),
        legacyWidget,
      ],
      layout: [
        ...originalDashboard.layout.filter((item) => item.i !== legacyWidgetId),
        legacyLayout,
      ],
      breakpoints: originalDashboard.breakpoints,
      cols: originalDashboard.cols,
    });

    try {
      await gotoApp(page, '/dashboard/custom');
      await waitForPageReady(page, {
        selectors: [
          'a:has-text("Back to Workbench"):visible',
          'a:has-text("View Settings"):visible',
          'button:has-text("Edit Layout")',
          'text=Saved legacy widget',
          'text=Remove it individually or reset the dashboard',
        ],
        timeoutMs: 30_000,
      });

      await page.getByRole('button', { name: /edit layout/i }).click();
      await waitForPageReady(page, {
        selectors: ['button[aria-label^="Remove "]'],
        timeoutMs: 30_000,
      });

      const removeWidget = page.getByRole('button', { name: /remove .* widget/i }).first();
      await removeWidget.focus();
      await expect(removeWidget).toBeFocused();
      await expectNoHorizontalOverflow(page, '/dashboard/custom legacy widget');
    } finally {
      await updateDashboard(page, adminSession.token, originalDashboard.id, {
        widgets: originalDashboard.widgets,
        layout: originalDashboard.layout,
        breakpoints: originalDashboard.breakpoints,
        cols: originalDashboard.cols,
      });
    }
  });

  test('keeps the workbench and responsive editor readable on a narrow viewport', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 390, height: 844 });

    await ensureEffectiveAdminLoginViaAPI(page);

    await gotoApp(page, '/dashboard');
    await waitForPageReady(page, {
      selectors: [
        'h1:has-text("Workbench Overview")',
        'button:has-text("Customize View")',
        'a:has-text("Customize Layout"):visible',
        'h2:has-text("Focus Queue")',
      ],
      timeoutMs: 30_000,
    });
    await expectNoHorizontalOverflow(page, '/dashboard mobile');

    await gotoApp(page, '/dashboard/custom');
    await waitForPageReady(page, {
      selectors: [
        'a:has-text("Back to Workbench"):visible',
        'a:has-text("View Settings"):visible',
        'button:has-text("Edit Layout")',
      ],
      timeoutMs: 30_000,
    });

    await page.getByRole('button', { name: /edit layout/i }).click();
    await waitForPageReady(page, {
      selectors: [
        'button:has-text("Add Widget")',
        'button:has-text("Save Layout")',
      ],
      timeoutMs: 30_000,
    });
    await expectNoHorizontalOverflow(page, '/dashboard/custom mobile');
  });
});
