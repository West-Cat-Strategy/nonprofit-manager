import request from 'supertest';
import app from '../../index';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

let authToken = '';
let testUserId = '';
let organizationId = '';

describe('Alerts API Integration', () => {
  beforeAll(async () => {
    const context = await createIntegrationAuthContext({
      role: 'viewer',
      emailPrefix: 'alerts-integration',
      accountName: 'Alerts Integration Org',
    });
    authToken = context.authToken;
    testUserId = context.userId;
    organizationId = context.organizationId;
  });

  afterAll(async () => {
    await deleteIntegrationAuthFixtures({
      userIds: [testUserId],
      organizationIds: [organizationId],
    });
  });
  it('rejects unauthenticated access', async () => {
    const response = await request(app).get('/api/v2/alerts/configs').expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'unauthorized',
        }),
      })
    );
  });

  it('rejects unauthenticated alert creation', async () => {
    const response = await request(app)
      .post('/api/v2/alerts/configs')
      .send({ name: 'A', metric_type: 'donations', condition: 'exceeds', frequency: 'daily', channels: ['email'], severity: 'low' })
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'unauthorized',
        }),
      })
    );
  });

  it('validates alert config payload for authenticated requests', async () => {
    const response = await request(app)
      .post('/api/v2/alerts/configs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        metric_type: 'donations',
        condition: 'exceeds',
        frequency: 'daily',
        channels: ['email'],
        severity: 'low',
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'validation_error');
    expect(response.body.error.details.validation.body).toEqual(
      expect.objectContaining({
        name: expect.any(Array),
      })
    );
  });

  it('validates alert instance query bounds for authenticated requests', async () => {
    const response = await request(app)
      .get('/api/v2/alerts/instances?limit=500')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'validation_error');
    expect(response.body.error.details.validation.query).toEqual(
      expect.objectContaining({
        limit: expect.any(Array),
      })
    );
  });
});
