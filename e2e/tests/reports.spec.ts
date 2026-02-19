import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';

test.describe('Reports Workflows', () => {
  test('creates report definition and verifies builder screen', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const response = await authenticatedPage.request.post(`${apiURL}/api/reports/generate`, {
      headers,
      data: { name: `E2E Report ${Date.now()}`, entity: 'contacts', fields: ['first_name', 'email'], filters: [], sort: [] },
    });
    expect([200, 201]).toContain(response.status());

    await authenticatedPage.goto('/reports/builder');
    await expect(authenticatedPage.getByRole('heading', { name: /report builder/i })).toBeVisible();
  });

  test('outcomes report page loads totals', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - 2);
    const toDate = now.toISOString().split('T')[0];
    const fromDate = from.toISOString().split('T')[0];

    const apiResponse = await authenticatedPage.request.get(
      `${apiURL}/api/reports/outcomes?from=${fromDate}&to=${toDate}&bucket=month`,
      { headers }
    );
    expect(apiResponse.ok()).toBeTruthy();

    await authenticatedPage.goto('/reports/outcomes');
    await expect(authenticatedPage.getByRole('heading', { name: /outcomes report/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/totals by outcome/i)).toBeVisible();
  });
});
