import request from 'supertest';
import app from '../../index';

describe('Ingest API Integration', () => {
  it('requires authentication for ingest preview-text', async () => {
    await request(app)
      .post('/api/ingest/preview-text')
      .send({ format: 'csv', text: 'a,b\n1,2' })
      .expect(401);
  });

  it('requires authentication for ingest preview upload', async () => {
    await request(app)
      .post('/api/ingest/preview')
      .expect(401);
  });
});
