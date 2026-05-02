import express from 'express';
import request from 'supertest';
import { csrfMiddleware } from '@middleware/csrf';
import { successEnvelopeMiddleware } from '@middleware/successEnvelope';
import { registerV2Routes } from '@routes/v2';
import { recordLocalUnsubscribeFromToken } from '../services/unsubscribeService';
import { createPublicCommunicationsRoutes } from '../routes';

jest.mock('../services/unsubscribeService', () => ({
  recordLocalUnsubscribeFromToken: jest.fn().mockResolvedValue({ accepted: true }),
}));

const mockRecordLocalUnsubscribeFromToken =
  recordLocalUnsubscribeFromToken as jest.MockedFunction<typeof recordLocalUnsubscribeFromToken>;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/public/communications', createPublicCommunicationsRoutes());
  return app;
};

const buildRegisteredApp = () => {
  const app = express();
  app.use(express.json());
  app.use(csrfMiddleware);
  app.use('/api', successEnvelopeMiddleware);
  registerV2Routes(app);
  return app;
};

const expectGenericUnsubscribeResponse = (body: unknown) => {
  expect(body).toMatchObject({
    success: true,
    data: {
      accepted: true,
      message: 'If this unsubscribe link is valid, the recipient has been unsubscribed.',
    },
  });
};

describe('public communications unsubscribe routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a generic success response for GET and delegates token handling', async () => {
    const response = await request(buildApp())
      .get('/api/v2/public/communications/unsubscribe/signed-token')
      .expect(200);

    expectGenericUnsubscribeResponse(response.body);
    expect(mockRecordLocalUnsubscribeFromToken).toHaveBeenCalledWith('signed-token');
  });

  it('returns a generic success response for POST and delegates token handling', async () => {
    const response = await request(buildApp())
      .post('/api/v2/public/communications/unsubscribe/signed-token')
      .send({})
      .expect(200);

    expectGenericUnsubscribeResponse(response.body);
    expect(mockRecordLocalUnsubscribeFromToken).toHaveBeenCalledWith('signed-token');
  });

  it.each([
    ['GET', 'get'],
    ['POST', 'post'],
  ] as const)('keeps invalid %s tokens generic while delegating to the no-leak service path', async (
    _methodLabel,
    requestMethod
  ) => {
    mockRecordLocalUnsubscribeFromToken.mockResolvedValueOnce({ accepted: true });

    const client = request(buildApp());
    const pendingRequest = client[requestMethod](
      '/api/v2/public/communications/unsubscribe/invalid-token'
    ).expect(200);
    const response = requestMethod === 'post' ? await pendingRequest.send({}) : await pendingRequest;

    expectGenericUnsubscribeResponse(response.body);
    expect(mockRecordLocalUnsubscribeFromToken).toHaveBeenCalledWith('invalid-token');
  });

  it('is mounted through the v2 registrar for unauthenticated one-click POSTs with encoded tokens', async () => {
    const token = 'payload.with:special+chars/signature';
    const encodedToken = encodeURIComponent(token);

    const response = await request(buildRegisteredApp())
      .post(`/api/v2/public/communications/unsubscribe/${encodedToken}`)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);

    expectGenericUnsubscribeResponse(response.body);
    expect(mockRecordLocalUnsubscribeFromToken).toHaveBeenCalledWith(token);
  });
});
