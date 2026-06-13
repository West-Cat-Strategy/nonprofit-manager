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

describe('Opportunities API integration', () => {
  let authToken = '';
  let userId = '';
  let organizationId = '';

  const suffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const withOrgAuth = (req: Test): Test =>
    req
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId);

  beforeAll(async () => {
    const context = await createIntegrationAuthContext({
      role: 'admin',
      emailPrefix: 'opportunities-admin',
      accountName: `Opportunities API Test Org ${suffix()}`,
    });
    authToken = context.authToken;
    userId = context.userId;
    organizationId = context.organizationId;
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM opportunity_stage_history
       WHERE opportunity_id IN (
         SELECT id FROM opportunities WHERE organization_id = $1
       )`,
      [organizationId]
    );
    await pool.query('DELETE FROM opportunities WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM opportunity_stages WHERE organization_id = $1', [organizationId]);
    await deleteIntegrationAuthFixtures({
      userIds: userId ? [userId] : [],
      organizationIds: organizationId ? [organizationId] : [],
    });
  });

  it('creates default stages, moves an opportunity, and reflects the pipeline summary', async () => {
    const initialStagesResponse = await withOrgAuth(request(app).get('/api/v2/opportunities/stages')).expect(200);
    const defaultStages = unwrap<Array<{ id: string; name: string }>>(initialStagesResponse.body);
    expect(defaultStages.map((stage) => stage.name)).toEqual(
      expect.arrayContaining(['Prospecting', 'Qualified', 'Proposal', 'Won', 'Lost'])
    );

    const discoveryStageResponse = await withOrgAuth(request(app).post('/api/v2/opportunities/stages'))
      .send({
        name: `Discovery ${suffix()}`,
        stage_order: defaultStages.length,
        probability: 45,
      })
      .expect(201);
    const discoveryStage = unwrap<{ id: string; name: string; probability: number }>(
      discoveryStageResponse.body
    );

    const createResponse = await withOrgAuth(request(app).post('/api/v2/opportunities'))
      .send({
        name: `Workforce partnership ${suffix()}`,
        amount: 12500,
        currency: 'CAD',
        expected_close_date: '2032-09-30',
        source: 'community-referral',
      })
      .expect(201);
    const opportunity = unwrap<{
      id: string;
      name: string;
      stage_id: string;
      stage_name: string;
      status: string;
    }>(createResponse.body);
    expect(opportunity.stage_name).toBe('Prospecting');
    expect(opportunity.status).toBe('open');

    const moveResponse = await withOrgAuth(
      request(app).post(`/api/v2/opportunities/${opportunity.id}/move-stage`)
    )
      .send({
        stage_id: discoveryStage.id,
        notes: 'Qualified during intake call',
      })
      .expect(200);
    const moved = unwrap<{ id: string; stage_id: string; stage_name: string }>(moveResponse.body);
    expect(moved.stage_id).toBe(discoveryStage.id);
    expect(moved.stage_name).toBe(discoveryStage.name);

    const listResponse = await withOrgAuth(
      request(app).get(`/api/v2/opportunities?stage_id=${discoveryStage.id}&search=Workforce`)
    ).expect(200);
    const listResult = unwrap<{ data: Array<{ id: string }>; pagination: { total: number } }>(
      listResponse.body
    );
    expect(listResult.data.map((row) => row.id)).toContain(opportunity.id);
    expect(listResult.pagination.total).toBeGreaterThanOrEqual(1);

    const summaryResponse = await withOrgAuth(request(app).get('/api/v2/opportunities/summary')).expect(200);
    const summary = unwrap<{
      total: number;
      open: number;
      stage_totals: Array<{ stage_id: string; count: number; amount: number }>;
    }>(summaryResponse.body);
    expect(summary.total).toBeGreaterThanOrEqual(1);
    expect(summary.open).toBeGreaterThanOrEqual(1);
    expect(summary.stage_totals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage_id: discoveryStage.id,
          count: expect.any(Number),
          amount: expect.any(Number),
        }),
      ])
    );
  });

  it('validates list filters before querying opportunity rows', async () => {
    const response = await withOrgAuth(request(app).get('/api/v2/opportunities?status=pending')).expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'validation_error',
      },
    });
  });
});
