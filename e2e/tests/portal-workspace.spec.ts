import { expect, test, type Page } from '@playwright/test';
<<<<<<< HEAD
=======
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
>>>>>>> origin/main
import { getAuthHeaders } from '../helpers/database';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';

type SuccessEnvelope<T> = {
  success?: boolean;
  data?: T;
};

const unwrap = <T>(payload: SuccessEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as SuccessEnvelope<T>).data as T;
  }
  return payload as T;
};

const getApiUrl = (): string => process.env.API_URL || 'http://127.0.0.1:3001';

async function createSharedPortalCaseFixture(page: Page) {
  const apiUrl = getApiUrl();
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const caseTitle = `Housing Support ${unique}`;
  const caseDescription = `Portal workspace fixture ${unique}`;
  const visibleNote = `Visible portal timeline note ${unique}`;

  const portalUser = await provisionApprovedPortalUser(page, {
    firstName: 'Workspace',
    lastName: 'Client',
    email: `portal-workspace-${unique}@example.com`,
  });
<<<<<<< HEAD
  const authHeaders = await getAuthHeaders(page, portalUser.adminToken);
=======

  const adminSession = await ensureEffectiveAdminLoginViaAPI(page, {
    firstName: 'Portal',
    lastName: 'Staff',
    organizationName: 'Portal Workspace Org',
  });
  const authHeaders = await getAuthHeaders(page, adminSession.token);
>>>>>>> origin/main

  const caseTypesResponse = await page.request.get(`${apiUrl}/api/v2/cases/types`, {
    headers: authHeaders,
  });
  expect(caseTypesResponse.ok()).toBeTruthy();
  const caseTypes = unwrap<Array<{ id: string }>>(await caseTypesResponse.json());
  expect(caseTypes.length).toBeGreaterThan(0);

  const createCaseResponse = await page.request.post(`${apiUrl}/api/v2/cases`, {
    headers: authHeaders,
    data: {
      contact_id: portalUser.contactId,
<<<<<<< HEAD
      account_id: portalUser.accountId,
=======
>>>>>>> origin/main
      case_type_id: caseTypes[0].id,
      title: caseTitle,
      description: caseDescription,
      client_viewable: false,
    },
  });
  expect(createCaseResponse.ok(), await createCaseResponse.text()).toBeTruthy();
  const createdCase = unwrap<{ id: string }>(await createCaseResponse.json());

<<<<<<< HEAD
  await page.evaluate((organizationId) => {
    localStorage.setItem('organizationId', organizationId);
  }, createdCase.account_id);

  const caseAuthHeaders = await getAuthHeaders(page, portalUser.adminToken);

  const createVisibleNoteResponse = await page.request.post(`${apiUrl}/api/v2/cases/notes`, {
    headers: caseAuthHeaders,
=======
  const createVisibleNoteResponse = await page.request.post(`${apiUrl}/api/v2/cases/notes`, {
    headers: authHeaders,
>>>>>>> origin/main
    data: {
      case_id: createdCase.id,
      note_type: 'note',
      content: visibleNote,
      visible_to_client: true,
    },
  });
  expect(createVisibleNoteResponse.ok(), await createVisibleNoteResponse.text()).toBeTruthy();

  const shareCaseResponse = await page.request.put(
    `${apiUrl}/api/v2/cases/${createdCase.id}/client-viewable`,
    {
<<<<<<< HEAD
      headers: caseAuthHeaders,
=======
      headers: authHeaders,
>>>>>>> origin/main
      data: {
        client_viewable: true,
      },
    }
  );
  expect(shareCaseResponse.ok(), await shareCaseResponse.text()).toBeTruthy();

  return {
    portalUser,
    caseId: createdCase.id,
    caseTitle,
    visibleNote,
  };
}

test.describe('Portal Workspace', () => {
  test('dashboard highlights shared cases and opens the case workspace', async ({ page }) => {
    const { portalUser, caseId, caseTitle, visibleNote } = await createSharedPortalCaseFixture(page);

    await loginPortalUserUI(page, portalUser);

    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: /your case workspace/i })).toBeVisible();
<<<<<<< HEAD
    await expect(page.getByText(caseTitle, { exact: true }).first()).toBeVisible();
=======
    await expect(page.getByText(caseTitle, { exact: true })).toBeVisible();
>>>>>>> origin/main
    await expect(page.getByRole('link', { name: /open workspace/i }).first()).toBeVisible();

    await page.getByRole('link', { name: /open workspace/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/portal/cases/${caseId}(?:\\?|$)`));
    await expect(page.locator('h1')).toHaveText(caseTitle);
    await expect(page.getByText(visibleNote)).toBeVisible();
    await expect(page.getByRole('heading', { name: /case timeline/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /case conversations/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /appointments for this case/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /case documents/i })).toBeVisible();
  });

  test('case workspace uploads documents and carries case context into messaging and appointments', async ({
    page,
  }) => {
    const { portalUser, caseId, caseTitle } = await createSharedPortalCaseFixture(page);

    await loginPortalUserUI(page, portalUser);

    await page.goto(`/portal/cases/${caseId}`);
    await expect(page.locator('h1')).toHaveText(caseTitle);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'client-intake.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Client intake notes for portal upload verification.', 'utf8'),
    });
    await page.getByLabel(/^title$/i).fill('Client Intake Packet');
    await page.getByLabel(/notes for staff/i).fill('Uploaded from Playwright workspace coverage.');
    await page.getByRole('button', { name: /upload document/i }).click();

    await expect(page.getByText(/document uploaded to your case workspace/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Client Intake Packet')).toBeVisible();

    await page.getByRole('link', { name: /message about this case/i }).click();
    await expect(page).toHaveURL(/\/portal\/messages(?:\?|$)/);
    await expect(page.locator('#portal-message-case')).toHaveValue(caseId);

    await page.goto(`/portal/cases/${caseId}`);
    await page.getByRole('link', { name: /book or request appointment/i }).click();
    await expect(page).toHaveURL(/\/portal\/appointments(?:\?|$)/);
    await expect(page.locator('select[aria-label="Select case"]')).toHaveValue(caseId);
  });
});
