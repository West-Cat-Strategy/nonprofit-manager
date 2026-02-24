import { test, expect } from '../fixtures/auth.fixture';
import { createAlertConfig, deleteAlertConfig } from '../helpers/domainFixtures';
import { getAuthHeaders } from '../helpers/database';
import { unwrapList } from '../helpers/apiEnvelope';

const apiURL = process.env.API_URL || 'HTTP://127.0.0.1:3001';

test.describe('Alerts Workflows', () => {
  test('create and delete alert config with UI consistency check', async ({ authenticatedPage, authToken }) => {
    const id = await createAlertConfig(authenticatedPage, authToken);
    expect(id).toBeTruthy();

    const headers = await getAuthHeaders(authenticatedPage, authToken);
    const listAfterCreate = await authenticatedPage.request.get(`${apiURL}/api/alerts/configs`, { headers });
    expect(listAfterCreate.ok()).toBeTruthy();
    const configsAfterCreate = unwrapList<{ id: string }>(await listAfterCreate.json());
    expect(configsAfterCreate.some((cfg) => cfg.id === id)).toBeTruthy();

    await deleteAlertConfig(authenticatedPage, authToken, id);

    const listAfterDelete = await authenticatedPage.request.get(`${apiURL}/api/alerts/configs`, { headers });
    expect(listAfterDelete.ok()).toBeTruthy();
    const configsAfterDelete = unwrapList<{ id: string }>(await listAfterDelete.json());
    expect(configsAfterDelete.some((cfg) => cfg.id === id)).toBeFalsy();
  });
});
