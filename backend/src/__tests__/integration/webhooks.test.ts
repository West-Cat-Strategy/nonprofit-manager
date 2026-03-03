import request from 'supertest';
import app from '../../index';

describe('Webhooks API Integration', () => {
  it('requires authentication for webhook endpoints', async () => {
    await request(app).get('/api/v2/webhooks/endpoints').expect(401);
  });

  it('requires authentication for API key listing', async () => {
    await request(app).get('/api/v2/webhooks/api-keys').expect(401);
  });
});
