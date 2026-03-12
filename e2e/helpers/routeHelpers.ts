import { expect, type Page } from '@playwright/test';

export const isTeamChatEnabled = (): boolean => {
  const rawValue = process.env.VITE_TEAM_CHAT_ENABLED ?? process.env.TEAM_CHAT_ENABLED;
  if (typeof rawValue !== 'string') {
    return true;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized !== 'false';
};

type WaitForPageReadyOptions = {
  url?: string | RegExp;
  selectors?: string[];
  requireNetworkIdle?: boolean;
  timeoutMs?: number;
};

export const waitForPageReady = async (
  page: Page,
  options: WaitForPageReadyOptions = {}
): Promise<void> => {
  const {
    url,
    selectors,
    requireNetworkIdle = false,
    timeoutMs = 20000,
  } = options;

  await page.waitForLoadState('domcontentloaded');

  if (url) {
    await expect(page).toHaveURL(url, { timeout: timeoutMs });
  }

  if (requireNetworkIdle) {
    await page.waitForLoadState('networkidle');
  }

  if (selectors && selectors.length > 0) {
    for (const selector of selectors) {
      await expect(page.locator(selector).first()).toBeVisible({ timeout: timeoutMs });
    }
  } else {
    await expect(page.locator('body')).toBeVisible({ timeout: timeoutMs });
  }
};

export const expectCriticalSection = async (
  page: Page,
  selectors: string[],
  timeoutMs = 15000
): Promise<void> => {
  await Promise.all(
    selectors.map(async (selector) => {
      await expect(page.locator(selector).first()).toBeVisible({ timeout: timeoutMs });
    })
  );
};
