import request from 'supertest';
import app from '../../index';

describe('Reports API Integration', () => {
  it('rejects unauthenticated report generation', async () => {
    await request(app).post('/api/reports/generate').send({}).expect(401);
  });

  it('rejects unauthenticated template reads', async () => {
    await request(app).get('/api/reports/templates').expect(401);
  });
});
