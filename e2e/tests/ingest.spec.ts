import '../helpers/testEnv';
import { test, expect } from '../fixtures/auth.fixture';
import { ensureLoginViaAPI } from '../helpers/auth';

test.describe('Ingest Workflows', () => {
  test('preview-text endpoint validates format and accepts CSV preview', async ({ authenticatedPage }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const uniqueSeed = Date.now();
    const email = `e2e+ingest-${uniqueSeed}-${Math.floor(Math.random() * 10000)}@example.com`;
    const password = 'Test123!@#';
    const session = await ensureLoginViaAPI(authenticatedPage, email, password, {
      firstName: 'Ingest',
      lastName: 'Worker',
    });
    const { token } = session;
    const organizationId = session.organizationId;

    const csrfResponse = await authenticatedPage.request.get(`${apiURL}/api/v2/auth/csrf-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      },
      timeout: 15000,
    });
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfBody = await csrfResponse.json();
    const csrfToken = csrfBody?.csrfToken || csrfBody?.data?.csrfToken;
    expect(typeof csrfToken).toBe('string');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': String(csrfToken),
      ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      Cookie: '',
    };

    const postPreview = async (data: { format: string; text: string }) => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          return await authenticatedPage.request.post(`${apiURL}/api/v2/ingest/preview-text`, {
            headers,
            data,
            timeout: 15000,
          });
        } catch (error) {
          lastError = error;
          if (attempt === 3) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        }
      }
      throw lastError;
    };

    const bad = await postPreview({ format: 'xml', text: '<a />' });
    expect(bad.status()).toBe(400);

    const ok = await postPreview({ format: 'csv', text: 'name,amount\nA,10' });
    expect(ok.ok()).toBeTruthy();
  });
});
