import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { clearAuth, ensureEffectiveAdminLoginViaAPI, ensureLoginViaAPI, login } from '../helpers/auth';
import { getSharedTestUser } from '../helpers/testUser';

type StartupThresholds = {
  startupRequestCountCap: number;
  startupRequestCountBaseline?: number;
  p75LoadMsCap: number;
  p75LoadMsBaseline?: number;
  firstNavigationP75MsCap: number;
};

const loginBootstrapRequestPatterns = [
  /\/api\/v2\/auth\/csrf-token(?:\?|$)/,
  /\/api\/v2\/auth\/me(?:\?|$)/,
  /\/api\/v2\/auth\/bootstrap(?:\?|$)/,
  /\/api\/v2\/auth\/registration-status(?:\?|$)/,
  /\/api\/v2\/auth\/setup-status(?:\?|$)/,
];

const thresholdsPath = path.resolve(__dirname, '..', '..', 'docs', 'performance', 'p4-t9d-thresholds.json');
const dashboardUrl = /\/dashboard(?:[/?#]|$)/;

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
};

const readRequiredNumber = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Startup threshold file ${thresholdsPath} is invalid: ${fieldName} must be a finite number`);
  }

  return value;
};

const readOptionalNumber = (value: unknown, fieldName: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredNumber(value, fieldName);
};

const readThresholds = (): StartupThresholds => {
  if (!fs.existsSync(thresholdsPath)) {
    throw new Error(`Missing startup threshold file: ${thresholdsPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to parse startup threshold file ${thresholdsPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Startup threshold file ${thresholdsPath} must contain a JSON object`);
  }

  const thresholds = parsed as Record<string, unknown>;

  return {
    startupRequestCountBaseline: readOptionalNumber(
      thresholds.startupRequestCountBaseline,
      'startupRequestCountBaseline'
    ),
    startupRequestCountCap: readRequiredNumber(thresholds.startupRequestCountCap, 'startupRequestCountCap'),
    p75LoadMsCap: readRequiredNumber(thresholds.p75LoadMsCap, 'p75LoadMsCap'),
    p75LoadMsBaseline: readOptionalNumber(thresholds.p75LoadMsBaseline, 'p75LoadMsBaseline'),
    firstNavigationP75MsCap: readRequiredNumber(
      thresholds.firstNavigationP75MsCap,
      'firstNavigationP75MsCap'
    ),
  };
};

const startupThresholds = readThresholds();
const apiURL = process.env.API_URL || 'http://127.0.0.1:3001';
const apiOrigin = new URL(apiURL).origin;

const clickNavLink = async (page: Page, link: ReturnType<Page['locator']>): Promise<void> => {
  try {
    await link.click({ timeout: 5000 });
  } catch {
    await link.evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.click();
      }
    });
  }
};

test.describe('Startup Performance Guards', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Startup guard thresholds are calibrated for Chromium CI runtime.');

  test('login to dashboard startup remains within request and p75 thresholds', async ({ page }) => {
    if (startupThresholds.p75LoadMsBaseline !== undefined) {
      expect(startupThresholds.p75LoadMsCap).toBeLessThanOrEqual(
        startupThresholds.p75LoadMsBaseline
      );
    }

    const sharedUser = getSharedTestUser();
    let password = 'Test123!@#';
    const fallbackEmail = `e2e+perf-startup-${Date.now()}@example.com`;
    const session = await ensureLoginViaAPI(page, fallbackEmail, password, {
      firstName: 'Perf',
      lastName: 'Guard',
    }).catch(async (error) => {
      if (
        !(error instanceof Error) ||
        !/fallback user creation failed|admin bootstrap failed before shared-user fallback/i.test(
          error.message
        )
      ) {
        throw error;
      }

      return ensureEffectiveAdminLoginViaAPI(page, {
        firstName: 'Perf',
        lastName: 'Guard',
        organizationName: 'E2E Organization',
      });
    });
    const email = typeof session.user?.email === 'string' ? session.user.email : fallbackEmail;
    const sessionPassword =
      'password' in session && typeof session.password === 'string' && session.password.length > 0
        ? session.password
        : undefined;
    password = sessionPassword || sharedUser.password || password;

    const requestCounts: number[] = [];
    const loadTimesMs: number[] = [];
    const firstNavigationTimesMs: number[] = [];
    const preferencesRequestCounts: number[] = [];
    const brandingRequestCounts: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      await clearAuth(page);

      const startupRequests = new Set<string>();
      let preferencesRequests = 0;
      let brandingRequests = 0;
      let requestPhase: 'startup' | 'first-navigation' | 'done' = 'startup';
      const trackRequest = (request: { url: () => string }) => {
        const url = request.url();
        const parsedUrl = new URL(url);
        const isBackendApiRequest =
          parsedUrl.origin === apiOrigin && parsedUrl.pathname.startsWith('/api/');
        const isLoginBootstrapRequest =
          isBackendApiRequest &&
          page.url().includes('/login') &&
          loginBootstrapRequestPatterns.some((pattern) => pattern.test(url));

        if (
          isBackendApiRequest &&
          /\/api\/(?:v2\/)?auth\/preferences(?:\?|$)/.test(url) &&
          requestPhase !== 'done'
        ) {
          preferencesRequests += 1;
        }
        if (
          isBackendApiRequest &&
          /\/api\/(?:v2\/)?admin\/branding(?:\?|$)/.test(url) &&
          requestPhase !== 'done'
        ) {
          brandingRequests += 1;
        }

        if (isBackendApiRequest && !isLoginBootstrapRequest) {
          if (requestPhase === 'startup') {
            startupRequests.add(url.replace(/\?.*$/, ''));
          }
        }
      };

      page.on('request', trackRequest);
      const startedAt = Date.now();
      await login(page, email, password);
      await expect(page).toHaveURL(dashboardUrl);
      await expect(
        page.getByRole('heading', { name: /workbench overview|dashboard/i }).first()
      ).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(800);
      loadTimesMs.push(Date.now() - startedAt);
      requestCounts.push(startupRequests.size);
      requestPhase = 'first-navigation';

      const contactsLink = page.locator('a[href="/contacts"]').first();
      const navigationStartedAt = Date.now();
      if (await contactsLink.isVisible().catch(() => false)) {
        await clickNavLink(page, contactsLink);
      } else {
        await clickNavLink(page, page.getByRole('link', { name: /people|contacts/i }).first());
      }
      await expect(page).toHaveURL('/contacts');
      await expect(page.getByRole('heading', { name: /people/i })).toBeVisible({ timeout: 10000 });
      firstNavigationTimesMs.push(Date.now() - navigationStartedAt);
      requestPhase = 'done';
      preferencesRequestCounts.push(preferencesRequests);
      brandingRequestCounts.push(brandingRequests);
      page.off('request', trackRequest);
    }

    const p75Load = percentile(loadTimesMs, 0.75);
    const p75Requests = percentile(requestCounts, 0.75);
    const p75FirstNavigationLoad = percentile(firstNavigationTimesMs, 0.75);

    expect(p75Load).toBeLessThanOrEqual(startupThresholds.p75LoadMsCap);
    expect(p75FirstNavigationLoad).toBeLessThanOrEqual(startupThresholds.firstNavigationP75MsCap);
    expect(p75Requests).toBeLessThanOrEqual(startupThresholds.startupRequestCountCap);
    expect(preferencesRequestCounts).toEqual([0, 0, 0, 0, 0]);
    expect(brandingRequestCounts).toEqual([0, 0, 0, 0, 0]);
  });
});
