import request from 'supertest';
import app from '../../index';

describe('Webhooks API Integration', () => {
  it('requires authentication for webhook endpoints', async () => {
    await request(app).get('/api/webhooks/endpoints').expect(401);
  });

  it('requires authentication for API key listing', async () => {
    await request(app).get('/api/webhooks/api-keys').expect(401);
  });
});
