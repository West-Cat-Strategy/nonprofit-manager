import request from 'supertest';
import app from '../../index';

describe('Saved Reports API Integration', () => {
  it('requires authentication to list saved reports', async () => {
    await request(app).get('/api/v2/saved-reports').expect(401);
  });

  it('requires authentication to create saved reports', async () => {
    await request(app)
      .post('/api/v2/saved-reports')
      .send({ name: 'A', entity: 'contacts', report_definition: {} })
      .expect(401);
  });
});
