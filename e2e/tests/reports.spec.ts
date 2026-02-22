import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';
import { ensureAdminLoginViaAPI } from '../helpers/auth';

test.describe('Reports Workflows', () => {
  test('creates report definition and verifies builder screen', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
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
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    let tokenForRequest = authToken;
    let hasAdminSession = false;
    try {
      const { token, user } = await ensureAdminLoginViaAPI(authenticatedPage);
      tokenForRequest = token;
      hasAdminSession = typeof user?.role === 'string' && user.role.toLowerCase() === 'admin';
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Invalid credentials')) {
        throw error;
      }
    }
    const headers = await getAuthHeaders(authenticatedPage, tokenForRequest);

    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - 2);
    const toDate = now.toISOString().split('T')[0];
    const fromDate = from.toISOString().split('T')[0];

    const apiResponse = await authenticatedPage.request.get(
      `${apiURL}/api/reports/outcomes?from=${fromDate}&to=${toDate}&bucket=month`,
      { headers }
    );
    if (!hasAdminSession) {
      expect([401, 403]).toContain(apiResponse.status());
      return;
    }
    expect(apiResponse.ok()).toBeTruthy();

    await authenticatedPage.goto('/reports/outcomes');
    await expect(authenticatedPage.getByRole('heading', { name: /outcomes report/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/totals by outcome/i)).toBeVisible();
  });
});
