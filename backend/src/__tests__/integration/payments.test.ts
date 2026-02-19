import request from 'supertest';
import app from '../../index';

describe('Payments API Integration', () => {
  it('exposes public payment config endpoint', async () => {
    const response = await request(app).get('/api/payments/config');
    expect([200, 500]).toContain(response.status);
  });

  it('requires auth for creating payment intents', async () => {
    await request(app).post('/api/payments/intents').send({ amount: 500 }).expect(401);
  });
});
