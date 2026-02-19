import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';

test.describe('Publishing Workflows', () => {
  test('publishing API validates payload and publishing UI loads', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const createSite = await authenticatedPage.request.post(`${apiURL}/api/sites`, {
      headers,
      data: { templateId: 'bad-uuid', name: '' },
    });
    expect(createSite.status()).toBe(400);

    await authenticatedPage.goto('/builder/templates');
    await expect(authenticatedPage.getByRole('navigation')).toBeVisible();
    await expect(authenticatedPage).toHaveURL(/\/builder\/templates|\/dashboard/);
  });
});
