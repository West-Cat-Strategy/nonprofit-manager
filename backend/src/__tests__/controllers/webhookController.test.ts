import type { Request, Response } from 'express';
import * as webhookController from '../../controllers/webhookController';

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockValidateWebhookUrl = jest.fn();
const mockCreateWebhookEndpoint = jest.fn();
const mockUpdateWebhookEndpoint = jest.fn();

jest.mock('../../services/webhookService', () => ({
  validateWebhookUrl: (...args: unknown[]) => mockValidateWebhookUrl(...args),
  createWebhookEndpoint: (...args: unknown[]) => mockCreateWebhookEndpoint(...args),
  updateWebhookEndpoint: (...args: unknown[]) => mockUpdateWebhookEndpoint(...args),
}));

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('webhookController URL validation', () => {
  beforeEach(() => {
    mockValidateWebhookUrl.mockReset();
    mockCreateWebhookEndpoint.mockReset();
    mockUpdateWebhookEndpoint.mockReset();
  });

  it('rejects blocked URLs on create', async () => {
    const req = {
      user: { id: 'user-1' },
      body: { url: 'HTTP://localhost/webhook', events: ['contact.created'] },
    } as unknown as Request;
    const res = mockResponse();

    mockValidateWebhookUrl.mockResolvedValueOnce({ ok: false, reason: 'Host is not allowed' });

    await webhookController.createWebhookEndpoint(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'bad_request', message: 'Host is not allowed' }),
      })
    );
    expect(mockCreateWebhookEndpoint).not.toHaveBeenCalled();
  });

  it('rejects blocked URLs on update', async () => {
    const req = {
      user: { id: 'user-1' },
      params: { id: 'endpoint-1' },
      body: { url: 'HTTP://localhost/webhook' },
    } as unknown as Request;
    const res = mockResponse();

    mockValidateWebhookUrl.mockResolvedValueOnce({ ok: false, reason: 'Host is not allowed' });

    await webhookController.updateWebhookEndpoint(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'bad_request', message: 'Host is not allowed' }),
      })
    );
    expect(mockUpdateWebhookEndpoint).not.toHaveBeenCalled();
  });
});
