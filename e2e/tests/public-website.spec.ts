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

      const publicBase = `http://${uniqueDomain}:3001`;
      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });

      await expect(
        authenticatedPage.getByRole('heading', { name: /a community hub built for care/i })
      ).toBeVisible();
      await expect(authenticatedPage.getByRole('link', { name: 'What\'s Happening' })).toBeVisible();
      await expect(authenticatedPage.getByRole('link', { name: 'Client Portal' })).toHaveAttribute(
        'data-track-click',
        'true'
      );

      const donateTrackPromise = authenticatedPage.waitForRequest((request) => {
        if (!request.url().includes(`/api/v2/sites/${siteId}/track`)) {
          return false;
        }
        const payload = request.postData();
        return Boolean(payload && payload.includes('"eventType":"click"') && payload.includes('Donate Now'));
      });
      await authenticatedPage.getByRole('link', { name: /donate now/i }).click();
      await donateTrackPromise;

      await authenticatedPage.goto(`${publicBase}/whats-happening`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /what's happening/i })).toBeVisible();
      await expect(authenticatedPage.getByText(/subscribe once and stay connected/i)).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: newsletterTitle })).toBeVisible();
      await expect(authenticatedPage.getByText(newsletterExcerpt)).toBeVisible();

      await authenticatedPage.goto(`${publicBase}/contact`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /make a referral/i })).toBeVisible();
      await expect(authenticatedPage.getByPlaceholder('Referral subject')).toBeVisible();

      const referralResponsePromise = authenticatedPage.waitForResponse((response) => {
        return response.url().includes('/api/v2/public/forms/') && response.request().method() === 'POST';
      });

      const referralForm = authenticatedPage.locator('form[data-public-site-form="true"]').filter({
        has: authenticatedPage.getByPlaceholder('Referral subject'),
      });

      await referralForm.getByPlaceholder('First name').fill('Jordan');
      await referralForm.getByPlaceholder('Last name').fill('Lee');
      await referralForm.getByPlaceholder('Email').fill('jordan.lee@example.com');
      await referralForm.getByPlaceholder('Referral subject').fill('Housing support');
      await referralForm.getByPlaceholder('Who is this referral coming from?').fill('Community clinic');
      await referralForm.getByPlaceholder('Tell us what is happening and how we can help.').fill(
        'Client needs warm handoff and follow-up this week.'
      );
      await referralForm.getByLabel(/mark this referral as urgent/i).check();
      await referralForm.getByRole('button', { name: /submit referral/i }).click();

      const referralResponse = await referralResponsePromise;
      expect(referralResponse.ok()).toBeTruthy();
      const referralBody = await referralResponse.json();
      const referralData = referralBody?.data || referralBody;
      expect(referralData.formType).toBe('referral-form');
      expect(referralData.caseId).toBeTruthy();
      await expect(authenticatedPage.getByText(/referral has been recorded/i)).toBeVisible();

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
        await deleteWebsiteEntry(authenticatedPage, authToken, siteId, newsletterEntryId).catch(() => undefined);
      }
      await deleteWebsiteSite(authenticatedPage, authToken, siteId);
    }
  });
});
