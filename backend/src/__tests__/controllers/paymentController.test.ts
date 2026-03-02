import type { Request, Response } from 'express';
import { handleWebhook, setPaymentPool } from '@controllers/paymentController';
import { stripeService } from '@services/domains/operations';

jest.mock('@services/domains/operations', () => ({
  stripeService: {
    constructWebhookEvent: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;

const createResponse = (): Response => {
  const res = {
    locals: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    getHeader: jest.fn(),
  };

  return res as unknown as Response;
};

describe('paymentController.handleWebhook', () => {
  const poolQuery = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    poolQuery.mockReset();
    setPaymentPool({ query: poolQuery } as any);
  });

  it('returns deterministic stale ack payload and bypasses success envelope', async () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000);
    mockStripeService.constructWebhookEvent.mockReturnValue({
      id: 'evt-stale',
      type: 'charge.refunded',
      created: staleDate,
      data: { object: {} },
    } as any);

    const req = {
      headers: { 'stripe-signature': 'sig_test' },
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = createResponse();

    await handleWebhook(req, res);

    expect(res.locals.skipSuccessEnvelope).toBe(true);
    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(200);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({
      received: true,
      rejected: true,
    });
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('returns deterministic duplicate ack payload for previously-seen event IDs', async () => {
    mockStripeService.constructWebhookEvent.mockReturnValue({
      id: 'evt-duplicate',
      type: 'charge.refunded',
      created: new Date(),
      data: { object: {} },
    } as any);

    poolQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const req = {
      headers: { 'stripe-signature': 'sig_test' },
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = createResponse();

    await handleWebhook(req, res);

    expect(res.locals.skipSuccessEnvelope).toBe(true);
    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(200);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({
      received: true,
      duplicate: true,
    });
    expect(poolQuery).toHaveBeenCalledTimes(1);
  });

  it('returns deterministic processing-error ack when verified event processing fails', async () => {
    mockStripeService.constructWebhookEvent.mockReturnValue({
      id: 'evt-processing-error',
      type: 'payment_intent.succeeded',
      created: new Date(),
      data: {},
    } as any);

    poolQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'receipt-1' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const req = {
      headers: { 'stripe-signature': 'sig_test' },
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = createResponse();

    await handleWebhook(req, res);

    expect(res.locals.skipSuccessEnvelope).toBe(true);
    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(200);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({
      received: true,
      processingError: true,
    });
    expect(poolQuery).toHaveBeenCalledTimes(2);
  });

  it('returns deterministic success ack after successful processing', async () => {
    mockStripeService.constructWebhookEvent.mockReturnValue({
      id: 'evt-success',
      type: 'charge.refunded',
      created: new Date(),
      data: { object: { payment_intent: 'pi_123', amount_refunded: 500 } },
    } as any);

    poolQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'receipt-1' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const req = {
      headers: { 'stripe-signature': 'sig_test' },
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = createResponse();

    await handleWebhook(req, res);

    expect(res.locals.skipSuccessEnvelope).toBe(true);
    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(200);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({
      received: true,
    });
    expect(poolQuery).toHaveBeenCalledTimes(2);
  });
});
