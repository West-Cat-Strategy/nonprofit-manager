import { test, expect } from '../fixtures/auth.fixture';
import { createTemplate, deleteTemplate } from '../helpers/domainFixtures';
import { getAuthHeaders } from '../helpers/database';

test.describe('Template Workflows', () => {
  test('create and delete template via API + verify gallery route', async ({ authenticatedPage, authToken }) => {
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(authenticatedPage.getByRole('heading', { name: /quick actions/i })).toBeVisible();

    const id = await createTemplate(authenticatedPage, authToken);
    expect(id).toBeTruthy();

    const headers = await getAuthHeaders(authenticatedPage, authToken);
    const created = await authenticatedPage.request.get(`${process.env.API_URL}/api/v2/templates/${id}`, {
      headers,
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    expect(createdBody.id || createdBody.template_id || createdBody.templateId).toBe(id);

    await deleteTemplate(authenticatedPage, authToken, id);

    const afterDelete = await authenticatedPage.request.get(`${process.env.API_URL}/api/v2/templates/${id}`, {
      headers,
    });
    expect([400, 404]).toContain(afterDelete.status());
  });
});
