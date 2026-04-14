import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';
import {
  createTemplate,
  createWebsiteSite,
  deleteTemplate,
  deleteWebsiteSite,
} from '../helpers/domainFixtures';

test.describe('Publishing Workflows', () => {
  test('publishing API validates payload and publishing UI loads', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const createSite = await authenticatedPage.request.post(`${apiURL}/api/v2/sites`, {
      headers,
      data: { templateId: 'bad-uuid', name: '' },
    });
    expect(createSite.status()).toBe(400);

    await authenticatedPage.goto('/website-builder');
    await expect(authenticatedPage).toHaveURL(/\/website-builder$/);
    await expect(authenticatedPage.getByRole('heading', { name: 'Website Builder' })).toBeVisible();
  });

  test('website console routes load and builder launch returns to the site overview', async ({
    authenticatedPage,
    authToken,
  }) => {
    test.setTimeout(180000);
    const templateId = await createTemplate(authenticatedPage, authToken);
    const siteName = `E2E Website ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
    });

    try {
      await authenticatedPage.goto('/websites', { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { level: 1, name: 'Websites', exact: true })
      ).toBeVisible();

      const siteCard = authenticatedPage.locator(`a[href="/websites/${siteId}/overview"]`).first();
      await expect(siteCard).toBeVisible();
      await siteCard.click();

      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/overview$`));
      await expect(
        authenticatedPage.locator('#main-content').getByRole('heading', { level: 1, name: siteName })
      ).toBeVisible();

      await authenticatedPage.locator('#main-content').getByRole('link', { name: 'Open Builder' }).click();
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/builder$`));
      await expect(authenticatedPage.getByText(/Site: /)).toBeVisible();
      await expect(authenticatedPage.getByText(/Publish status: /)).toBeVisible();

      await authenticatedPage.getByRole('button', { name: 'Back to website console' }).click();
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/overview$`));

      await authenticatedPage.goto('/websites', { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage).toHaveURL(/\/websites$/);
      await expect(
        authenticatedPage.getByRole('heading', { level: 1, name: 'Websites', exact: true })
      ).toBeVisible();
    } finally {
      await deleteWebsiteSite(authenticatedPage, authToken, siteId);
      await deleteTemplate(authenticatedPage, authToken, templateId);
    }
  });
});
