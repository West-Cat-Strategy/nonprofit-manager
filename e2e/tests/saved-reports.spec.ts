import { test, expect } from '../fixtures/auth.fixture';
import { createSavedReport, deleteSavedReport } from '../helpers/domainFixtures';

test.describe('Saved Reports Workflows', () => {
  test('create and delete saved report via API + verify saved reports page', async ({ authenticatedPage, authToken }) => {
    const id = await createSavedReport(authenticatedPage, authToken);
    expect(id).toBeTruthy();

    await authenticatedPage.goto('/reports/saved');
    await expect(authenticatedPage.getByRole('heading', { name: /saved reports/i })).toBeVisible();

    await deleteSavedReport(authenticatedPage, authToken, id);
  });
});
