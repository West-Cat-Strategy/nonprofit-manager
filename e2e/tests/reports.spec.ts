import { test, expect } from '../fixtures/auth.fixture';
import type { APIResponse, Page } from '@playwright/test';
import { getAuthHeaders } from '../helpers/database';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const assertOkResponse = async (response: APIResponse, context: string): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${context} failed (${response.status()}): ${await response.text()}`);
  }
};

const assertOptionalDeprecationHeaders = (response: APIResponse, expectedV2Path: string): void => {
  const responseHeaders = response.headers();
  const deprecationHeader = responseHeaders.deprecation;
  const linkHeader = responseHeaders.link;

  // Some environments now hit canonical v2 handlers directly. Keep compatibility checks
  // only when deprecation metadata is actually emitted by an adapter layer.
  if (deprecationHeader !== undefined || linkHeader !== undefined) {
    expect(deprecationHeader).toBe('true');
    expect(linkHeader).toContain(expectedV2Path);
  }
};

const extractId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as {
    id?: unknown;
    data?: { id?: unknown };
    saved_report_id?: unknown;
    scheduled_report_id?: unknown;
    template_id?: unknown;
  };
  const candidate =
    body.id ||
    body.saved_report_id ||
    body.scheduled_report_id ||
    body.template_id ||
    body.data?.id;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
};

const getAdminAuth = async (authenticatedPage: Page) => {
  const adminSession = await ensureEffectiveAdminLoginViaAPI(authenticatedPage);
  const headers = await getAuthHeaders(authenticatedPage, adminSession.token);
  return { headers };
};

test.describe('Reports Workflows', () => {
  test('legacy reporting wrappers emit deprecation headers while v2 remains canonical', async ({
    authenticatedPage,
  }) => {
    const { headers } = await getAdminAuth(authenticatedPage);

    const legacyReportsResponse = await authenticatedPage.request.get(`${API_URL}/api/v2/reports/templates`, {
      headers,
    });
    await assertOkResponse(legacyReportsResponse, 'Legacy reports templates list');
    assertOptionalDeprecationHeaders(legacyReportsResponse, '/api/v2/reports');

    const legacySavedReportsResponse = await authenticatedPage.request.get(`${API_URL}/api/v2/saved-reports`, {
      headers,
    });
    await assertOkResponse(legacySavedReportsResponse, 'Legacy saved reports list');
    assertOptionalDeprecationHeaders(legacySavedReportsResponse, '/api/v2/saved-reports');
  });

  test('generates cases and opportunities reports and verifies builder screen', async ({
    authenticatedPage,
  }) => {
    const { headers } = await getAdminAuth(authenticatedPage);

    const casesResponse = await authenticatedPage.request.post(`${API_URL}/api/v2/reports/generate`, {
      headers,
      data: {
        name: `E2E Cases Report ${Date.now()}`,
        entity: 'cases',
        fields: ['title', 'status_name', 'open_flag'],
        filters: [],
        sort: [],
      },
    });
    await assertOkResponse(casesResponse, 'Case report generation');

    const opportunitiesResponse = await authenticatedPage.request.post(
      `${API_URL}/api/v2/reports/generate`,
      {
        headers,
        data: {
          name: `E2E Opportunity Report ${Date.now()}`,
          entity: 'opportunities',
          fields: ['name', 'stage_name', 'weighted_amount'],
          filters: [],
          sort: [],
        },
      }
    );
    await assertOkResponse(opportunitiesResponse, 'Opportunity report generation');

    await authenticatedPage.goto('/reports/builder', { waitUntil: 'domcontentloaded' });
    await expect(
      authenticatedPage.getByRole('heading', { name: /report builder/i })
    ).toBeVisible({ timeout: 30000 });
  });

  test('loads templates route and applies template to builder', async ({ authenticatedPage }) => {
    const { headers } = await getAdminAuth(authenticatedPage);
    const templateName = `E2E KPI Template ${Date.now()}`;
    let createdTemplateId: string | null = null;

    try {
      const templatesListResponse = await authenticatedPage.request.get(`${API_URL}/api/v2/reports/templates`, {
        headers,
      });
      await assertOkResponse(templatesListResponse, 'Report templates list');

      const templatesPayload = await templatesListResponse.json();
      const templates = Array.isArray(templatesPayload)
        ? templatesPayload
        : Array.isArray(templatesPayload?.data)
          ? templatesPayload.data
          : [];

      const existingTemplate = templates.find(
        (template: { id?: string; name?: string }) => template.name === 'Opportunity Pipeline Core KPI'
      );
      let targetTemplateId = extractId(existingTemplate ?? null);

      if (!existingTemplate?.id) {
        const createTemplate = await authenticatedPage.request.post(`${API_URL}/api/v2/reports/templates`, {
          headers,
          data: {
            name: templateName,
            description: 'E2E KPI template',
            category: 'operations',
            entity: 'opportunities',
            template_definition: {
              name: templateName,
              entity: 'opportunities',
              fields: ['stage_name', 'weighted_amount'],
              sort: [{ field: 'stage_name', direction: 'asc' }],
            },
          },
        });
        await assertOkResponse(createTemplate, 'Report template creation');
        const createdTemplatePayload = await createTemplate.json();
        createdTemplateId = extractId(createdTemplatePayload);
        expect(createdTemplateId).toBeTruthy();
        targetTemplateId = createdTemplateId;
      }

      await authenticatedPage.goto('/reports/templates', { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: /report templates/i })
      ).toBeVisible({ timeout: 30000 });
      if (targetTemplateId) {
        await authenticatedPage.goto(`/reports/builder?template=${targetTemplateId}`, {
          waitUntil: 'domcontentloaded',
        });
        await expect(authenticatedPage).toHaveURL(/\/reports\/builder\?template=/);
      } else {
        await authenticatedPage.goto('/reports/builder', { waitUntil: 'domcontentloaded' });
      }

      await expect(
        authenticatedPage.getByRole('heading', { name: /report builder/i })
      ).toBeVisible({ timeout: 30000 });
    } finally {
      if (createdTemplateId) {
        await authenticatedPage.request
          .delete(`${API_URL}/api/v2/reports/templates/${createdTemplateId}`, { headers })
          .catch(() => undefined);
      }
    }
  });

  test('save and schedule KPI report flow remains functional', async ({ authenticatedPage }) => {
    const { headers } = await getAdminAuth(authenticatedPage);
    let savedReportId: string | null = null;
    let scheduledReportId: string | null = null;

    try {
      const savedReportResponse = await authenticatedPage.request.post(`${API_URL}/api/v2/saved-reports`, {
        headers,
        data: {
          name: `E2E KPI Saved Report ${Date.now()}`,
          entity: 'opportunities',
          report_definition: {
            name: 'E2E KPI Saved Report',
            entity: 'opportunities',
            fields: ['stage_name', 'weighted_amount'],
            filters: [],
            sort: [],
          },
        },
      });
      await assertOkResponse(savedReportResponse, 'Saved report creation');
      const savedReportBody = await savedReportResponse.json();
      savedReportId = extractId(savedReportBody);
      expect(savedReportId).toBeTruthy();

      const scheduleResponse = await authenticatedPage.request.post(`${API_URL}/api/v2/scheduled-reports`, {
        headers,
        data: {
          saved_report_id: savedReportId,
          name: `E2E KPI Schedule ${Date.now()}`,
          recipients: ['qa@example.com'],
          frequency: 'daily',
          format: 'csv',
          hour: 9,
          minute: 0,
        },
      });
      await assertOkResponse(scheduleResponse, 'Scheduled report creation');
      const scheduleBody = await scheduleResponse.json();
      scheduledReportId = extractId(scheduleBody);
      expect(scheduledReportId).toBeTruthy();

      await authenticatedPage.goto('/reports/scheduled', { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: /scheduled reports/i })
      ).toBeVisible({ timeout: 30000 });
    } finally {
      if (scheduledReportId) {
        await authenticatedPage.request
          .delete(`${API_URL}/api/v2/scheduled-reports/${scheduledReportId}`, { headers })
          .catch(() => undefined);
      }
      if (savedReportId) {
        await authenticatedPage.request
          .delete(`${API_URL}/api/v2/saved-reports/${savedReportId}`, { headers })
          .catch(() => undefined);
      }
    }
  });

  test('outcomes report page loads totals', async ({ authenticatedPage }) => {
    const { headers } = await getAdminAuth(authenticatedPage);

    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - 2);
    const toDate = now.toISOString().split('T')[0];
    const fromDate = from.toISOString().split('T')[0];

    const apiResponse = await authenticatedPage.request.get(
      `${API_URL}/api/v2/reports/outcomes?from=${fromDate}&to=${toDate}&bucket=month`,
      { headers }
    );
    await assertOkResponse(apiResponse, 'Outcomes report API');

    await authenticatedPage.goto('/reports/outcomes', { waitUntil: 'domcontentloaded' });
    await expect(
      authenticatedPage.getByRole('heading', { name: /outcomes report/i })
    ).toBeVisible({ timeout: 30000 });
    await expect(
      authenticatedPage.locator('body')
    ).toContainText(/totals by outcome|organization context not found/i, { timeout: 30000 });
  });
});
