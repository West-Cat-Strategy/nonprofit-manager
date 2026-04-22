import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { getAuthHeaders } from '../helpers/database';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';

type SuccessEnvelope<T> = {
  success?: boolean;
  data?: T;
};

type PortalCaseFormAssignment = {
  id: string;
  title: string;
  status: string;
  due_at?: string | null;
  case_number?: string | null;
  case_title?: string | null;
};

const backendRequire = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'package.json'));
const { Client: PgClient } = backendRequire('pg') as {
  Client: new (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) => {
    connect(): Promise<void>;
    end(): Promise<void>;
    query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[]
    ): Promise<{ rows: T[] }>;
  };
};

const unwrap = <T>(payload: SuccessEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as SuccessEnvelope<T>).data as T;
  }
  return payload as T;
};

const getApiUrl = (): string => process.env.API_URL || 'http://127.0.0.1:3001';

const getTestDatabaseConfig = (): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} => ({
  host: process.env.DB_HOST || process.env.E2E_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.E2E_DB_PORT || '8012'),
  database: process.env.DB_NAME || process.env.E2E_DB_NAME || 'nonprofit_manager_test',
  user: process.env.E2E_DB_ADMIN_USER || process.env.TEST_DB_ADMIN_USER || 'postgres',
  password: process.env.E2E_DB_ADMIN_PASSWORD || process.env.TEST_DB_ADMIN_PASSWORD || 'postgres',
});

const buildPortalFormSchema = (title: string) => ({
  version: 1,
  title,
  sections: [
    {
      id: 'section-1',
      title: 'Details',
      questions: [
        {
          id: 'question-notes',
          key: 'notes',
          type: 'textarea',
          label: 'Notes',
          required: true,
        },
      ],
    },
  ],
});

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
  const authHeaders = await getAuthHeaders(page, portalUser.adminToken);

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
      account_id: portalUser.accountId,
      case_type_id: caseTypes[0].id,
      title: caseTitle,
      description: caseDescription,
      client_viewable: false,
    },
  });
  expect(createCaseResponse.ok(), await createCaseResponse.text()).toBeTruthy();
  const createdCase = unwrap<{ id: string; account_id?: string }>(await createCaseResponse.json());

  await page.evaluate((organizationId) => {
    localStorage.setItem('organizationId', organizationId);
  }, createdCase.account_id ?? portalUser.accountId);

  const caseAuthHeaders = await getAuthHeaders(page, portalUser.adminToken);

  const caseDetailResponse = await page.request.get(`${apiUrl}/api/v2/cases/${createdCase.id}`, {
    headers: caseAuthHeaders,
  });
  expect(caseDetailResponse.ok(), await caseDetailResponse.text()).toBeTruthy();
  const caseDetail = unwrap<{ case_number: string; title: string }>(await caseDetailResponse.json());

  const createVisibleNoteResponse = await page.request.post(`${apiUrl}/api/v2/cases/notes`, {
    headers: caseAuthHeaders,
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
      headers: caseAuthHeaders,
      data: {
        client_viewable: true,
      },
    }
  );
  expect(shareCaseResponse.ok(), await shareCaseResponse.text()).toBeTruthy();

  return {
    portalUser,
    caseId: createdCase.id,
    caseNumber: caseDetail.case_number,
    caseTitle: caseDetail.title,
    visibleNote,
  };
}

async function seedPortalFormAssignments(
  input: {
    caseId: string;
    contactId: string;
    organizationId: string;
    portalUserId: string;
    dueAt: string;
  }
): Promise<{
  activeAssignment: PortalCaseFormAssignment;
  reviewedAssignment: PortalCaseFormAssignment;
}> {
  const client = new PgClient(getTestDatabaseConfig());
  const activeTitle = `Client Intake Refresh ${Date.now()}`;
  const reviewedTitle = `Consent Confirmation ${Date.now()}`;

  try {
    await client.connect();

    const activeAssignmentResult = await client.query<PortalCaseFormAssignment>(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         due_at,
         delivery_target,
         sent_at
       )
       VALUES ($1, $2, $3, $4, $5, 'sent', $6::jsonb, '{}'::jsonb, $7, 'portal', NOW())
       RETURNING id, title, status, due_at`,
      [
        input.caseId,
        input.contactId,
        input.organizationId,
        activeTitle,
        'Please share your latest intake details.',
        JSON.stringify(buildPortalFormSchema(activeTitle)),
        input.dueAt,
      ]
    );
    const activeAssignment = activeAssignmentResult.rows[0];
    if (!activeAssignment) {
      throw new Error('Portal forms fixture failed to create the active assignment.');
    }

    const reviewedAssignmentResult = await client.query<PortalCaseFormAssignment>(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         delivery_target,
         sent_at,
         submitted_at,
         reviewed_at
       )
       VALUES ($1, $2, $3, $4, $5, 'reviewed', $6::jsonb, $7::jsonb, 'portal', NOW() - interval '3 days', NOW() - interval '2 days', NOW() - interval '1 day')
       RETURNING id, title, status, due_at`,
      [
        input.caseId,
        input.contactId,
        input.organizationId,
        reviewedTitle,
        'Reviewed portal consent submission.',
        JSON.stringify(buildPortalFormSchema(reviewedTitle)),
        JSON.stringify({ notes: 'Consent confirmed' }),
      ]
    );
    const reviewedAssignment = reviewedAssignmentResult.rows[0];
    if (!reviewedAssignment) {
      throw new Error('Portal forms fixture failed to create the reviewed assignment.');
    }

    await client.query(
      `INSERT INTO case_form_submissions (
         assignment_id,
         case_id,
         contact_id,
         submission_number,
         answers,
         mapping_audit,
         response_packet_file_name,
         response_packet_file_path,
         submitted_by_actor_type,
         submitted_by_portal_user_id
       )
       VALUES ($1, $2, $3, 1, $4::jsonb, '[]'::jsonb, $5, $6, 'portal', $7)`,
      [
        reviewedAssignment.id,
        input.caseId,
        input.contactId,
        JSON.stringify({ notes: 'Consent confirmed' }),
        'portal-reviewed-packet.pdf',
        `case-forms/portal-reviewed-packet-${Date.now()}.pdf`,
        input.portalUserId,
      ]
    );

    return {
      activeAssignment,
      reviewedAssignment,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createPortalFormsInboxFixture(page: Page) {
  const baseFixture = await createSharedPortalCaseFixture(page);
  const dueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const { activeAssignment, reviewedAssignment } = await seedPortalFormAssignments({
    caseId: baseFixture.caseId,
    contactId: baseFixture.portalUser.contactId,
    organizationId: baseFixture.portalUser.accountId,
    portalUserId: baseFixture.portalUser.portalUserId,
    dueAt,
  });

  return {
    ...baseFixture,
    activeAssignment,
    reviewedAssignment,
    dueAt,
  };
}

async function listPortalAssignments(page: Page, status: 'active' | 'completed'): Promise<PortalCaseFormAssignment[]> {
  const response = await page.request.get(`${getApiUrl()}/api/v2/portal/forms/assignments`, {
    params: { status },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return unwrap<PortalCaseFormAssignment[]>(await response.json());
}

test.describe('Portal Workspace', () => {
  test('dashboard highlights shared cases and opens the case workspace', async ({ page }) => {
    const { portalUser, caseId, caseTitle, visibleNote } = await createSharedPortalCaseFixture(page);

    await loginPortalUserUI(page, portalUser);

    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: /your case workspace/i })).toBeVisible();
    await expect(page.getByText(caseTitle, { exact: true }).first()).toBeVisible();
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

  test('portal forms uses assignment-backed active and completed buckets with case context and packets', async ({
    page,
  }) => {
    const { portalUser, caseId, caseNumber, caseTitle, activeAssignment, reviewedAssignment, dueAt } =
      await createPortalFormsInboxFixture(page);

    await loginPortalUserUI(page, portalUser);
    await expect
      .poll(async () => JSON.stringify(await listPortalAssignments(page, 'active')))
      .toContain(activeAssignment.id);
    await expect
      .poll(async () => JSON.stringify(await listPortalAssignments(page, 'completed')))
      .toContain(reviewedAssignment.id);

    await page.goto('/portal/forms');
    await expect(page.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(activeAssignment.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(`${caseNumber} - ${caseTitle}`).first()).toBeVisible();
    await expect(page.getByText(`Due ${new Date(dueAt).toLocaleDateString()}`).first()).toBeVisible();

    await page.getByRole('button', { name: 'Completed' }).click();
    await expect(page.getByRole('button', { name: 'Completed' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(reviewedAssignment.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /download response packet/i })).toHaveAttribute(
      'href',
      `/api/v2/portal/forms/assignments/${reviewedAssignment.id}/response-packet`
    );
    await expect(page.getByRole('link', { name: /^packet$/i })).toHaveAttribute(
      'href',
      `/api/v2/portal/forms/assignments/${reviewedAssignment.id}/response-packet`
    );
  });
});
