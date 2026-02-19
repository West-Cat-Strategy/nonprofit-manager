import request from 'supertest';
import app from '../../index';

describe('Reconciliation API Integration', () => {
  it('rejects unauthenticated list requests', async () => {
    await request(app).get('/api/reconciliation').expect(401);
  });

  it('rejects unauthenticated dashboard requests', async () => {
    await request(app).get('/api/reconciliation/dashboard').expect(401);
  });
});
