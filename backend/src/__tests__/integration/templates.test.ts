import request from 'supertest';
import app from '../../index';

describe('Templates API Integration', () => {
  it('requires authentication for templates listing', async () => {
    await request(app).get('/api/v2/templates').expect(401);
  });

  it('requires authentication for template creation', async () => {
    await request(app)
      .post('/api/v2/templates')
      .send({ name: 'T', category: 'landing-page' })
      .expect(401);
  });
});
