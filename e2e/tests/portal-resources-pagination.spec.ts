import { test, expect } from '@playwright/test';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';

test.describe('Portal Resources Pagination + Filtering', () => {
  test('uses server query params and offset pagination for portal documents', async ({ page }) => {
    const portalUser = await provisionApprovedPortalUser(page);
    await loginPortalUserUI(page, portalUser);

    const documentQueries: URLSearchParams[] = [];

    await page.route('**/api/v2/portal/documents**', async (route) => {
      const url = new URL(route.request().url());
      const params = new URLSearchParams(url.searchParams.toString());
      documentQueries.push(params);

      const offset = Number(params.get('offset') ?? '0');
      const payload =
        offset === 0
          ? {
              items: [
                {
                  id: 'doc-1',
                  original_name: 'budget-workbook.pdf',
                  document_type: 'report',
                  title: 'Budget Workbook',
                  description: 'Initial packet',
                  file_size: 1024,
                  mime_type: 'application/pdf',
                  created_at: new Date().toISOString(),
                },
              ],
              page: { limit: 20, offset: 0, has_more: true, total: 2 },
            }
          : {
              items: [
                {
                  id: 'doc-2',
                  original_name: 'intake-checklist.pdf',
                  document_type: 'form',
                  title: 'Intake Checklist',
                  description: 'Follow-up packet',
                  file_size: 2048,
                  mime_type: 'application/pdf',
                  created_at: new Date().toISOString(),
                },
              ],
              page: { limit: 20, offset: 1, has_more: false, total: 2 },
            };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: payload }),
      });
    });

    await page.goto('/portal/documents');
    await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible();
    await expect(page.getByText('Budget Workbook')).toBeVisible();

    await expect
      .poll(() => documentQueries.length)
      .toBeGreaterThan(0);
    expect(documentQueries[0].get('sort')).toBe('created_at');
    expect(documentQueries[0].get('order')).toBe('desc');
    expect(documentQueries[0].get('limit')).toBe('20');
    expect(documentQueries[0].get('offset')).toBe('0');

    await page.getByLabel('Search').fill('budget');
    await expect.poll(() => documentQueries.some((params) => params.get('search') === 'budget')).toBeTruthy();

    await page.getByRole('button', { name: /load more documents/i }).click();
    await expect(page.getByText('Intake Checklist')).toBeVisible();
    await expect.poll(() => documentQueries.some((params) => params.get('offset') === '1')).toBeTruthy();
  });
});
