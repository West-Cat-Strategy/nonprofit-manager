import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import { getJwtSecret } from '../../config/jwt';

const authToken = jwt.sign(
  {
    id: 'alerts-integration-user',
    email: 'alerts-integration@example.com',
    role: 'user',
  },
  getJwtSecret(),
  { expiresIn: '1h' }
);

describe('Alerts API Integration', () => {
  it('rejects unauthenticated access', async () => {
    await request(app).get('/api/v2/alerts/configs').expect(401);
  });

  it('rejects unauthenticated alert creation', async () => {
    await request(app)
      .post('/api/v2/alerts/configs')
      .send({ name: 'A', metric_type: 'donations', condition: 'exceeds', frequency: 'daily', channels: ['email'], severity: 'low' })
      .expect(401);
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
  });

  it('validates alert instance query bounds for authenticated requests', async () => {
    const response = await request(app)
      .get('/api/v2/alerts/instances?limit=500')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error.code', 'validation_error');
  });
});
