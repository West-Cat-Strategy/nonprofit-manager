import request from 'supertest';
import app from '../../index';

describe('Reports API Integration', () => {
  it('rejects unauthenticated report generation', async () => {
    await request(app).post('/api/v2/reports/generate').send({}).expect(401);
  });

  it('rejects unauthenticated template reads', async () => {
    await request(app).get('/api/v2/reports/templates').expect(401);
  });
});
