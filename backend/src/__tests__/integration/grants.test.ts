import request, { type Test } from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

describe('Grants API Integration', () => {
  let authToken = '';
  let adminUserId = '';
  let organizationId = '';
  const suffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const withOrgAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId);

  const unwrap = <T>(body: unknown): T => {
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as { data: T }).data;
    }

    return body as T;
  };

  beforeAll(async () => {
    const context = await createIntegrationAuthContext({
      role: 'admin',
      emailPrefix: 'grants-admin',
      accountName: `Grants Integration Test Org ${Date.now()}`,
    });
    adminUserId = context.userId;
    organizationId = context.organizationId;
    authToken = context.authToken;
  });

  it('rejects unauthenticated summary requests', async () => {
    await request(app).get('/api/v2/grants/summary').expect(401);
  });

  it('validates the grants summary query before hitting the service layer', async () => {
    await request(app)
      .get('/api/v2/grants/summary?jurisdiction=not-a-jurisdiction')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(400);
  });

  it('returns an authenticated grants summary response', async () => {
    const response = await withOrgAuth(request(app).get('/api/v2/grants/summary')).expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total_funders: expect.any(Number),
          total_awards: expect.any(Number),
          by_status: expect.any(Array),
          recent_activity: expect.any(Array),
          upcoming_items: expect.any(Array),
        }),
      })
    );
  });

  it('covers the funder, program, and application lifecycle boundaries', async () => {
    const funderResponse = await withOrgAuth(request(app).post('/api/v2/grants/funders'))
      .send({
        name: `Community Funder ${suffix()}`,
        jurisdiction: 'foundation',
        contact_email: 'funding@example.org',
      })
      .expect(201);
    const funder = unwrap<{ id: string; name: string; jurisdiction: string }>(funderResponse.body);
    expect(funder).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        jurisdiction: 'foundation',
      })
    );

    const programResponse = await withOrgAuth(request(app).post('/api/v2/grants/programs'))
      .send({
        funder_id: funder.id,
        name: `Employment Supports ${suffix()}`,
        fiscal_year: '2032',
        jurisdiction: 'foundation',
        status: 'open',
        application_due_at: '2032-10-31',
        total_budget: 50000,
      })
      .expect(201);
    const program = unwrap<{ id: string; funder_id: string; status: string }>(programResponse.body);
    expect(program).toMatchObject({
      funder_id: funder.id,
      status: 'open',
    });

    const applicationResponse = await withOrgAuth(request(app).post('/api/v2/grants/applications'))
      .send({
        application_number: `APP-${suffix()}`,
        title: 'Supported employment pilot',
        funder_id: funder.id,
        program_id: program.id,
        requested_amount: 25000,
        status: 'draft',
        due_at: '2032-10-15',
      })
      .expect(201);
    const application = unwrap<{
      id: string;
      funder_id: string;
      program_id: string;
      status: string;
      requested_amount: number | string;
    }>(applicationResponse.body);
    expect(application).toMatchObject({
      funder_id: funder.id,
      program_id: program.id,
      status: 'draft',
    });
    expect(Number(application.requested_amount)).toBe(25000);

    const statusResponse = await withOrgAuth(
      request(app).patch(`/api/v2/grants/applications/${application.id}/status`)
    )
      .send({
        status: 'submitted',
        notes: 'Submitted through integration coverage',
      })
      .expect(200);
    const updatedApplication = unwrap<{ id: string; status: string }>(statusResponse.body);
    expect(updatedApplication).toMatchObject({
      id: application.id,
      status: 'submitted',
    });

    const listResponse = await withOrgAuth(
      request(app).get(`/api/v2/grants/applications?funder_id=${funder.id}&status=submitted`)
    ).expect(200);
    const listResult = unwrap<{ data: Array<{ id: string }> }>(listResponse.body);
    expect(listResult.data.map((row) => row.id)).toContain(application.id);
  });

  it('rejects invalid grant identifiers before service lookup', async () => {
    const response = await withOrgAuth(request(app).get('/api/v2/grants/funders/not-a-uuid')).expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'validation_error',
      },
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM grant_applications WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM grant_programs WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM grant_funders WHERE organization_id = $1', [organizationId]);
    await deleteIntegrationAuthFixtures({
      userIds: [adminUserId],
      organizationIds: [organizationId],
    });
  });
});
