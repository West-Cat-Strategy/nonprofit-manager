import request from 'supertest';
import app from '../../index';

describe('Alerts API Integration', () => {
  it('rejects unauthenticated access', async () => {
    await request(app).get('/api/alerts/configs').expect(401);
  });

  it('rejects unauthenticated alert creation', async () => {
    await request(app)
      .post('/api/alerts/configs')
      .send({ name: 'A', metric_type: 'donations', condition: 'exceeds', frequency: 'daily', channels: ['email'], severity: 'low' })
      .expect(401);
  });
});
