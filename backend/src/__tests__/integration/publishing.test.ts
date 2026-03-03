import request from 'supertest';
import app from '../../index';

describe('Publishing API Integration', () => {
  it('requires authentication for site search', async () => {
    await request(app).get('/api/v2/sites').expect(401);
  });

  it('requires authentication for site creation', async () => {
    await request(app)
      .post('/api/v2/sites')
      .send({ templateId: 'bad-uuid', name: '' })
      .expect(401);
  });
});
