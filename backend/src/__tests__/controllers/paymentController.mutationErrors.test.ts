import type { Request, Response } from 'express';

const mockPaymentProviderService = {
  getPaymentIntent: jest.fn(),
  cancelPaymentIntent: jest.fn(),
  createRefund: jest.fn(),
  createCustomer: jest.fn(),
  getCustomer: jest.fn(),
  listPaymentMethods: jest.fn(),
  getPaymentConfig: jest.fn(() => ({ defaultProvider: 'stripe' })),
};

jest.mock('@services/paymentProviderService', () => ({
  __esModule: true,
  default: mockPaymentProviderService,
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/auditService', () => ({
  appendAuditLog: jest.fn(),
}));

jest.mock('@modules/shared/http/envelope', () => ({
  sendSuccess: jest.fn((res: Response, data: unknown, status?: number) => {
    if (status) {
      return res.status(status).json(data);
    }
    return res.status(200).json(data);
  }),
  sendProviderAck: jest.fn(),
  sendError: jest.fn((res: Response, code: string, message: string, status: number) =>
    res.status(status).json({ success: false, error: { code, message } })
  ),
}));

jest.mock('@modules/recurringDonations/services/recurringDonationService', () => ({
  recurringDonationService: {},
}));

import {
  cancelPaymentIntent,
  createRefund,
  getCustomer,
  getPaymentIntent,
  listPaymentMethods,
} from '@modules/payments/controllers/paymentController';

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

describe('paymentController mutation error mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps missing payment intent to 404 on getPaymentIntent', async () => {
    mockPaymentProviderService.getPaymentIntent.mockRejectedValueOnce({
      code: 'resource_missing',
    });

    const req = { params: { id: 'pi_123' }, query: {} } as unknown as Request;
    const res = createResponse();

    await getPaymentIntent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps missing payment intent to 404 on cancelPaymentIntent', async () => {
    mockPaymentProviderService.cancelPaymentIntent.mockRejectedValueOnce({
      code: 'resource_missing',
    });

    const req = { params: { id: 'pi_123' }, query: {} } as unknown as Request;
    const res = createResponse();

    await cancelPaymentIntent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps missing refund target to 404 on createRefund', async () => {
    mockPaymentProviderService.createRefund.mockRejectedValueOnce({
      code: 'resource_missing',
    });

    const req = {
      body: { paymentIntentId: 'pi_123', provider: 'stripe' },
      user: { id: 'user-1' },
    } as unknown as Request;
    const res = createResponse();

    await createRefund(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps missing customer to 404 on getCustomer', async () => {
    mockPaymentProviderService.getCustomer.mockRejectedValueOnce({
      code: 'resource_missing',
    });

    const req = { params: { id: 'cus_123' }, query: {} } as unknown as Request;
    const res = createResponse();

    await getCustomer(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps missing customer payment methods to 404 on listPaymentMethods', async () => {
    mockPaymentProviderService.listPaymentMethods.mockRejectedValueOnce({
      code: 'resource_missing',
    });

    const req = { params: { customerId: 'cus_123' }, query: {} } as unknown as Request;
    const res = createResponse();

    await listPaymentMethods(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
