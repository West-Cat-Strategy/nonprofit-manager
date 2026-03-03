import request from 'supertest';
import app from '../../index';

const expectUnauthorizedEnvelope = (response: request.Response): void => {
  expect(response.body).toMatchObject({
    success: false,
    error: {
      code: 'unauthorized',
      message: expect.any(String),
    },
  });
};

describe('Reference pattern route guards', () => {
  it.each([
    '/api/v2/follow-ups',
    '/api/v2/scheduled-reports',
    '/api/v2/opportunities',
    '/api/v2/opportunities',
  ])('requires auth for %s', async (path) => {
    const response = await request(app)
      .get(path)
      .expect(401);

    expectUnauthorizedEnvelope(response);
  });
});
