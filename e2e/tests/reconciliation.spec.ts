import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';

test.describe('Reconciliation Workflows', () => {
  test('loads reconciliation endpoints and dashboard page', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const listResp = await authenticatedPage.request.get(`${apiURL}/api/reconciliation`, { headers });
    expect([200, 204]).toContain(listResp.status());

    const dashboardResp = await authenticatedPage.request.get(`${apiURL}/api/reconciliation/dashboard`, { headers });
    expect([200, 204]).toContain(dashboardResp.status());

    await authenticatedPage.goto('/reconciliation');
    await expect(authenticatedPage.getByRole('heading', { name: /payment reconciliation/i })).toBeVisible();
  });
});
