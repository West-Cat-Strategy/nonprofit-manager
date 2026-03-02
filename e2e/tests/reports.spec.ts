import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';
import { ensureAdminLoginViaAPI } from '../helpers/auth';

test.describe('Reports Workflows', () => {
  test('generates cases and opportunities reports and verifies builder screen', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const casesResponse = await authenticatedPage.request.post(`${apiURL}/api/reports/generate`, {
      headers,
      data: {
        name: `E2E Cases Report ${Date.now()}`,
        entity: 'cases',
        fields: ['title', 'status_name', 'open_flag'],
        filters: [],
        sort: [],
      },
    });
    expect([200, 201]).toContain(casesResponse.status());

    const opportunitiesResponse = await authenticatedPage.request.post(`${apiURL}/api/reports/generate`, {
      headers,
      data: {
        name: `E2E Opportunity Report ${Date.now()}`,
        entity: 'opportunities',
        fields: ['name', 'stage_name', 'weighted_amount'],
        filters: [],
        sort: [],
      },
    });
    expect([200, 201]).toContain(opportunitiesResponse.status());

    await authenticatedPage.goto('/reports/builder');
    await expect(authenticatedPage.getByRole('heading', { name: /report builder/i })).toBeVisible();
  });

  test('loads templates route and applies template to builder', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);
    const templateName = `E2E KPI Template ${Date.now()}`;

    const createTemplate = await authenticatedPage.request.post(`${apiURL}/api/reports/templates`, {
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
    expect([200, 201]).toContain(createTemplate.status());

    await authenticatedPage.goto('/reports/templates');
    await expect(authenticatedPage.getByRole('heading', { name: /report templates/i })).toBeVisible();
    await expect(authenticatedPage.getByText(templateName)).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /use template/i }).first().click();
    await expect(authenticatedPage).toHaveURL(/\\/reports\\/builder\\?template=/);
    await expect(authenticatedPage.getByRole('heading', { name: /report builder/i })).toBeVisible();
  });

  test('save and schedule KPI report flow remains functional', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const savedReportResponse = await authenticatedPage.request.post(`${apiURL}/api/saved-reports`, {
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
    expect([200, 201]).toContain(savedReportResponse.status());
    const savedReportBody = await savedReportResponse.json();
    const savedReportId = savedReportBody.id || savedReportBody.data?.id;
    expect(savedReportId).toBeTruthy();

    const scheduleResponse = await authenticatedPage.request.post(`${apiURL}/api/scheduled-reports`, {
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
    expect([200, 201]).toContain(scheduleResponse.status());

    await authenticatedPage.goto('/reports/scheduled');
    await expect(authenticatedPage.getByRole('heading', { name: /scheduled reports/i })).toBeVisible();
  });

  test('outcomes report page loads totals', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'HTTP://localhost:3001';
    let tokenForRequest = authToken;
    let hasAdminSession = false;
    try {
      const { token, user } = await ensureAdminLoginViaAPI(authenticatedPage);
      tokenForRequest = token;
      hasAdminSession = typeof user?.role === 'string' && user.role.toLowerCase() === 'admin';
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Invalid credentials')) {
        throw error;
      }
    }
    const headers = await getAuthHeaders(authenticatedPage, tokenForRequest);

    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - 2);
    const toDate = now.toISOString().split('T')[0];
    const fromDate = from.toISOString().split('T')[0];

    const apiResponse = await authenticatedPage.request.get(
      `${apiURL}/api/reports/outcomes?from=${fromDate}&to=${toDate}&bucket=month`,
      { headers }
    );
    if (!hasAdminSession) {
      expect([401, 403]).toContain(apiResponse.status());
      return;
    }
    expect(apiResponse.ok()).toBeTruthy();

    await authenticatedPage.goto('/reports/outcomes');
    await expect(authenticatedPage.getByRole('heading', { name: /outcomes report/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/totals by outcome/i)).toBeVisible();
  });
});
