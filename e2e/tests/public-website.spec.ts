import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';
import {
  createWebsiteEntry,
  createWebsiteSite,
  deleteWebsiteEntry,
  deleteWebsiteSite,
  publishWebsiteSite,
} from '../helpers/domainFixtures';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const getPublicSitePort = (): string => {
  const configuredPort = process.env.E2E_PUBLIC_SITE_PORT?.trim();
  if (configuredPort) {
    return configuredPort;
  }

  const configuredEnvPort = process.env.PUBLIC_SITE_PORT?.trim();
  if (configuredEnvPort) {
    return configuredEnvPort;
  }

  return '3001';
};

async function getSystemTemplateId(page: import('@playwright/test').Page, authToken: string): Promise<string> {
  const headers = await getAuthHeaders(page, authToken);
  const response = await page.request.get(`${API_URL}/api/v2/templates/system`, { headers });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const templates = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const starter = templates.find((template: { name?: string }) => template?.name === 'Community Nonprofit Hub');
  if (!starter?.id) {
    throw new Error(`Unable to find Community Nonprofit Hub template: ${JSON.stringify(body)}`);
  }
  return starter.id as string;
}

test.describe('Public website starter', () => {
  test('renders the nonprofit starter, tracks CTAs, and submits the referral form', async ({
    authenticatedPage,
    authToken,
  }) => {
    const templateId = await getSystemTemplateId(authenticatedPage, authToken);
    const uniqueDomain = `community-hub-${Date.now().toString(36)}.localhost`;
    const siteName = `Community Hub ${Date.now()}`;
    let newsletterEntryId = '';
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
      customDomain: uniqueDomain,
    });
    const newsletterTitle = `Community Update ${Date.now()}`;
    const newsletterExcerpt = 'A community update about programs, events, and support.';

    try {
      newsletterEntryId = await createWebsiteEntry(authenticatedPage, authToken, siteId, {
        title: newsletterTitle,
        excerpt: newsletterExcerpt,
        bodyHtml: `<p>${newsletterExcerpt}</p><p>Registration and referral pathways are open this week.</p>`,
        status: 'published',
        slug: `community-update-${Date.now().toString(36)}`,
      });

      await publishWebsiteSite(authenticatedPage, authToken, {
        siteId,
        templateId,
      });

      const publicBase = `http://${uniqueDomain}:${getPublicSitePort()}`;
      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });

      await expect(
        authenticatedPage.getByRole('heading', { name: /a community hub built for care/i })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('main').getByRole('link', { name: "What's Happening" })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('main').getByRole('link', { name: 'Client Portal' })
      ).toHaveAttribute(
        'data-track-click',
        'true'
      );

      const getInvolvedLink = authenticatedPage.getByRole('main').getByRole('link', { name: /get involved/i });
      await expect(getInvolvedLink).toHaveAttribute('data-track-click', 'true');
      await getInvolvedLink.click();

      await authenticatedPage.goto(`${publicBase}/whats-happening`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /what's happening/i })).toBeVisible();
      await expect(authenticatedPage.getByText(/subscribe once and stay connected/i)).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: newsletterTitle })).toBeVisible();
      await expect(authenticatedPage.getByText(newsletterExcerpt)).toBeVisible();

      await authenticatedPage.goto(`${publicBase}/contact`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /contact and referral/i })).toBeVisible();
      const contactTextboxes = authenticatedPage.getByRole('main').getByRole('textbox');
      await expect(contactTextboxes.nth(0)).toBeVisible();
      await expect(contactTextboxes.nth(1)).toBeVisible();
      await expect(contactTextboxes.nth(2)).toBeVisible();
      await expect(contactTextboxes.nth(3)).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /send message/i })).toBeVisible();
      await authenticatedPage.getByRole('button', { name: /send message/i }).click();

      await authenticatedPage.goto(`${publicBase}/?preview=true`, { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: /a community hub built for care/i })
      ).toBeVisible();
      const hasOverflow = await authenticatedPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(hasOverflow).toBe(false);
    } finally {
      if (newsletterEntryId) {
        void deleteWebsiteEntry(authenticatedPage, authToken, siteId, newsletterEntryId).catch(() => undefined);
      }
      void deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
    }
  });
});
