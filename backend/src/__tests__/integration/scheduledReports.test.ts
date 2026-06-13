import request, { type Test } from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

type ApiEnvelope<T> = { data?: T } | T;

const unwrap = <T>(body: ApiEnvelope<T>): T =>
  (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

describe('Scheduled reports API integration', () => {
  let authToken = '';
  let userId = '';
  let organizationId = '';
  let savedReportId = '';

  const suffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const withOrgAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId);

  beforeAll(async () => {
    const context = await createIntegrationAuthContext({
      role: 'admin',
      emailPrefix: 'scheduled-reports-admin',
      accountName: `Scheduled Reports API Test Org ${suffix()}`,
    });
    authToken = context.authToken;
    userId = context.userId;
    organizationId = context.organizationId;

    const savedReportResult = await pool.query<{ id: string }>(
      `INSERT INTO saved_reports (
         name,
         description,
         entity,
         report_definition,
         created_by,
         is_public
       )
       VALUES ($1, 'Scheduled report integration fixture', 'tasks', $2, $3, FALSE)
       RETURNING id`,
      [
        `Scheduled Report Fixture ${suffix()}`,
        JSON.stringify({
          fields: ['subject', 'status'],
          filters: [],
          sort: [{ field: 'created_at', direction: 'desc' }],
          limit: 25,
        }),
        userId,
      ]
    );
    savedReportId = savedReportResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM scheduled_report_runs
       WHERE scheduled_report_id IN (
         SELECT id FROM scheduled_reports WHERE organization_id = $1
       )`,
      [organizationId]
    );
    await pool.query('DELETE FROM scheduled_reports WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM saved_reports WHERE id = $1', [savedReportId]);
    await deleteIntegrationAuthFixtures({
      userIds: userId ? [userId] : [],
      organizationIds: organizationId ? [organizationId] : [],
    });
  });

  it('creates, toggles, lists run history, and deletes a scheduled report', async () => {
    const createResponse = await withOrgAuth(request(app).post('/api/v2/scheduled-reports'))
      .send({
        saved_report_id: savedReportId,
        name: 'Weekly volunteer digest',
        recipients: ['ops@example.org'],
        format: 'csv',
        frequency: 'weekly',
        timezone: 'America/Vancouver',
        hour: 8,
        minute: 30,
        day_of_week: 2,
      })
      .expect(201);
    const created = unwrap<{
      id: string;
      saved_report_id: string;
      recipients: string[];
      is_active: boolean;
      next_run_at: string;
    }>(createResponse.body);
    expect(created.saved_report_id).toBe(savedReportId);
    expect(created.recipients).toEqual(['ops@example.org']);
    expect(created.is_active).toBe(true);
    expect(new Date(created.next_run_at).getTime()).not.toBeNaN();

    const toggleResponse = await withOrgAuth(
      request(app).post(`/api/v2/scheduled-reports/${created.id}/toggle`)
    )
      .send({ is_active: false })
      .expect(200);
    const toggled = unwrap<{ id: string; is_active: boolean }>(toggleResponse.body);
    expect(toggled).toMatchObject({ id: created.id, is_active: false });

    await pool.query(
      `INSERT INTO scheduled_report_runs (
         scheduled_report_id,
         status,
         recipients,
         metadata
       )
       VALUES ($1, 'success', $2, $3::jsonb)`,
      [created.id, ['ops@example.org'], JSON.stringify({ source: 'integration-test' })]
    );

    const runsResponse = await withOrgAuth(
      request(app).get(`/api/v2/scheduled-reports/${created.id}/runs?limit=5`)
    ).expect(200);
    const runs = unwrap<Array<{ status: string; recipients: string[]; metadata: Record<string, unknown> | null }>>(
      runsResponse.body
    );
    expect(runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'success',
          recipients: ['ops@example.org'],
          metadata: expect.objectContaining({ source: 'integration-test' }),
        }),
      ])
    );

    await withOrgAuth(request(app).delete(`/api/v2/scheduled-reports/${created.id}`)).expect(204);
    await withOrgAuth(request(app).get(`/api/v2/scheduled-reports/${created.id}`)).expect(404);
  });

  it('rejects invalid schedule timezones before creating delivery records', async () => {
    const response = await withOrgAuth(request(app).post('/api/v2/scheduled-reports'))
      .send({
        saved_report_id: savedReportId,
        recipients: ['ops@example.org'],
        frequency: 'weekly',
        timezone: 'Not/AZone',
        day_of_week: 2,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: expect.objectContaining({
        code: 'validation_error',
      }),
    });
  });
});
