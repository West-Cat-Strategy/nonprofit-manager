import request from 'supertest';
import app from '../../index';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

describe('Grants API Integration', () => {
  let authToken = '';
  let adminUserId = '';
  let organizationId = '';

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
    const response = await request(app)
      .get('/api/v2/grants/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

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

  afterAll(async () => {
    await deleteIntegrationAuthFixtures({
      userIds: [adminUserId],
      organizationIds: [organizationId],
    });
  });
});
