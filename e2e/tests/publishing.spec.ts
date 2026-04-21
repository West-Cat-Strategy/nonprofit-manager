import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';
import {
  createWebsiteSite,
  deleteWebsiteSite,
  publishWebsiteSite,
} from '../helpers/domainFixtures';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getSystemTemplateId(
  page: import('@playwright/test').Page,
  authToken: string
): Promise<string> {
  const headers = await getAuthHeaders(page, authToken);
  const response = await page.request.get(`${API_URL}/api/v2/templates/system`, { headers });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const templates = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const starter = templates.find(
    (template: { name?: string }) => template?.name === 'Community Nonprofit Hub'
  );

  if (!starter?.id) {
    throw new Error(`Unable to find Community Nonprofit Hub template: ${JSON.stringify(body)}`);
  }

  return starter.id as string;
}

test.describe('Publishing Workflows', () => {
  test('publishing API validates payload and publishing UI loads', async ({
    authenticatedPage,
    authToken,
  }) => {
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const createSite = await authenticatedPage.request.post(`${API_URL}/api/v2/sites`, {
      headers,
      data: { templateId: 'bad-uuid', name: '' },
    });
    expect(createSite.status()).toBe(400);

    await authenticatedPage.goto('/website-builder');
    await expect(authenticatedPage).toHaveURL(/\/website-builder$/);
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Website Builder' })
    ).toBeVisible();
  });

  test('site-aware website surfaces expose the managed-form verification loop', async ({
    authenticatedPage,
    authToken,
  }) => {
    test.setTimeout(180000);

    const templateId = await getSystemTemplateId(authenticatedPage, authToken);
    const siteName = `P5 Website ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const subdomain = `p5-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
      subdomain,
    });

    try {
      await publishWebsiteSite(authenticatedPage, authToken, {
        siteId,
        templateId,
      });

      await authenticatedPage.goto(`/websites/${siteId}/overview`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/overview$`));
      await expect(
        authenticatedPage
          .locator('#main-content')
          .getByRole('heading', { level: 1, name: siteName })
      ).toBeVisible();
      await expect(authenticatedPage.getByText('Managed form spotlight')).toBeVisible();
      await expect(
        authenticatedPage.getByText('Submission endpoint', { exact: true })
      ).toBeVisible();
      await expect(authenticatedPage.getByText(new RegExp(`/api/v2/public/forms/${siteId}/`))).toBeVisible();

      await authenticatedPage.goto(`/websites/${siteId}/forms`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/forms$`));
      await expect(authenticatedPage.getByText('Managed form launch verification')).toBeVisible();
      await expect(
        authenticatedPage.getByText('Submission endpoint', { exact: true })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('link', { name: 'Open builder' })
      ).toHaveAttribute('href', `/websites/${siteId}/builder`);

      await authenticatedPage.goto(`/websites/${siteId}/publishing`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/publishing$`));
      await expect(authenticatedPage.getByText('Managed form publish verification')).toBeVisible();
      await expect(authenticatedPage.getByText('Publishing controls')).toBeVisible();

      await authenticatedPage.goto(`/websites/${siteId}/builder`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/builder$`));
      await expect(authenticatedPage.getByText(/Site: /)).toBeVisible();
      await expect(authenticatedPage.getByText(/Publish status: /)).toBeVisible();
      await expect(authenticatedPage.getByText(/Managed forms: /)).toBeVisible();

      await authenticatedPage
        .getByRole('button', { name: 'Back to website console' })
        .click();
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/overview$`));
    } finally {
      await deleteWebsiteSite(authenticatedPage, authToken, siteId);
    }
  });
});
