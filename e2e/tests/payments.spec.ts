import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';

test.describe('Payments Workflows', () => {
  test('supports config + intent validation + navigation persistence', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const config = await authenticatedPage.request.get(`${apiURL}/api/payments/config`);
    expect(config.ok()).toBeTruthy();

    const invalidIntent = await authenticatedPage.request.post(`${apiURL}/api/payments/intents`, {
      headers,
      data: { amount: 1, currency: 'cad' },
    });
    expect(invalidIntent.status()).toBe(400);

    await authenticatedPage.goto('/donations');
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage).toHaveURL('/dashboard');
    await expect(authenticatedPage.getByRole('heading', { name: /quick tools/i })).toBeVisible();
  });
});
