import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { clearAuth, ensureLoginViaAPI, login } from '../helpers/auth';

type StartupThresholds = {
  startupRequestCountCap: number;
  p75LoadMsCap: number;
};

const thresholdsPath = path.resolve(__dirname, '..', '..', 'docs', 'performance', 'p4-t9d-thresholds.json');

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
};

const readThresholds = (): StartupThresholds => {
  try {
    const parsed = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8')) as {
      startupRequestCountCap?: number;
      p75LoadMsCap?: number;
    };

    return {
      startupRequestCountCap: parsed.startupRequestCountCap ?? 6,
      p75LoadMsCap: parsed.p75LoadMsCap ?? 2000,
    };
  } catch {
    return {
      startupRequestCountCap: 6,
      p75LoadMsCap: 2000,
    };
  }
};

test.describe('Startup Performance Guards', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Startup guard thresholds are calibrated for Chromium CI runtime.');

  test('login to dashboard startup remains within request and p75 thresholds', async ({ page }) => {
    const password = 'Test123!@#';
    const fallbackEmail = `e2e+perf-startup-${Date.now()}@example.com`;
    const session = await ensureLoginViaAPI(page, fallbackEmail, password, {
      firstName: 'Perf',
      lastName: 'Guard',
    });
    const email = typeof session.user?.email === 'string' ? session.user.email : fallbackEmail;
    const thresholds = readThresholds();

    const requestCounts: number[] = [];
    const loadTimesMs: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      await clearAuth(page);

      const startupRequests = new Set<string>();
      const trackRequest = (request: { url: () => string }) => {
        const url = request.url();
        if (url.includes('/api/')) {
          startupRequests.add(url.replace(/\?.*$/, ''));
        }
      };

      page.on('request', trackRequest);
      const startedAt = Date.now();
      await login(page, email, password);
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(800);
      loadTimesMs.push(Date.now() - startedAt);
      requestCounts.push(startupRequests.size);
      page.off('request', trackRequest);
    }

  const p75Load = percentile(loadTimesMs, 0.75);
  const p75Requests = percentile(requestCounts, 0.75);
  const p75LoadCap = process.env.CI ? thresholds.p75LoadMsCap + 250 : thresholds.p75LoadMsCap;

  expect(p75Load).toBeLessThanOrEqual(p75LoadCap);
  expect(p75Requests).toBeLessThanOrEqual(thresholds.startupRequestCountCap);
  });
});
