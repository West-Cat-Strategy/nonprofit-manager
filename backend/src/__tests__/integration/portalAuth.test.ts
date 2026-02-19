import request from 'supertest';
import app from '../../index';

describe('Portal Auth API Integration', () => {
  it('validates portal signup payload', async () => {
    await request(app)
      .post('/api/portal/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'weak',
        firstName: '',
        lastName: '',
      })
      .expect(400);
  });

  it('requires portal auth for /me', async () => {
    await request(app).get('/api/portal/auth/me').expect(401);
  });
});
