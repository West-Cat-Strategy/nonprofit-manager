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
    '/api/follow-ups',
    '/api/scheduled-reports',
    '/api/opportunities',
    '/api/v2/opportunities',
  ])('requires auth for %s', async (path) => {
    const response = await request(app)
      .get(path)
      .expect(401);

    expectUnauthorizedEnvelope(response);
  });
});
