import { test, expect } from '../fixtures/auth.fixture';
import { createTemplate, deleteTemplate } from '../helpers/domainFixtures';
import { getAuthHeaders } from '../helpers/database';

test.describe('Template Workflows', () => {
  test('create and delete template via API + verify gallery route', async ({ authenticatedPage, authToken }) => {
    await expect(authenticatedPage.getByRole('heading', { name: 'Quick Tools' })).toBeVisible();

    const id = await createTemplate(authenticatedPage, authToken);
    expect(id).toBeTruthy();

    const headers = await getAuthHeaders(authenticatedPage, authToken);
    const created = await authenticatedPage.request.get(`${process.env.API_URL}/api/templates/${id}`, {
      headers,
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    expect(createdBody.id || createdBody.template_id || createdBody.templateId).toBe(id);

    await deleteTemplate(authenticatedPage, authToken, id);

    const afterDelete = await authenticatedPage.request.get(`${process.env.API_URL}/api/templates/${id}`, {
      headers,
    });
    expect([400, 404]).toContain(afterDelete.status());
  });
});
