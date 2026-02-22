import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';

test.describe('Ingest Workflows', () => {
  test('preview-text endpoint validates format and accepts CSV preview', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const bad = await authenticatedPage.request.post(`${apiURL}/api/ingest/preview-text`, {
      headers,
      data: { format: 'xml', text: '<a />' },
    });
    expect(bad.status()).toBe(400);

    const ok = await authenticatedPage.request.post(`${apiURL}/api/ingest/preview-text`, {
      headers,
      data: { format: 'csv', text: 'name,amount\nA,10' },
    });
    expect(ok.ok()).toBeTruthy();
  });
});
