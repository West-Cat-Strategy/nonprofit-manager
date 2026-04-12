import { Response } from 'express';

const mockService = {
  manualMatch: jest.fn(),
  resolveDiscrepancy: jest.fn(),
  assignDiscrepancy: jest.fn(),
};

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

jest.mock('../../services/auditService', () => ({
  appendAuditLog: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../modules/reconciliation/services/reconciliationService', () => mockService);

jest.mock('@utils/responseHelpers', () => ({
  badRequest: jest.fn((res: Response, message: string) => res.status(400).json({ message })),
  conflict: jest.fn((res: Response, message: string) => res.status(409).json({ message })),
  notFoundMessage: jest.fn((res: Response, message: string) => res.status(404).json({ message })),
  serverError: jest.fn((res: Response, message: string) => res.status(500).json({ message })),
  serviceUnavailable: jest.fn((res: Response, message: string) => res.status(503).json({ message })),
}));

jest.mock('../../utils/responseHelpers', () => ({
  badRequest: jest.fn((res: Response, message: string) => res.status(400).json({ message })),
  conflict: jest.fn((res: Response, message: string) => res.status(409).json({ message })),
  notFoundMessage: jest.fn((res: Response, message: string) => res.status(404).json({ message })),
  serverError: jest.fn((res: Response, message: string) => res.status(500).json({ message })),
  serviceUnavailable: jest.fn((res: Response, message: string) => res.status(503).json({ message })),
}));

import {
  assignDiscrepancy,
  manualMatch,
  resolveDiscrepancy,
} from '../../modules/reconciliation/controllers/reconciliationController';

const buildResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe('reconciliation controller mutation mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves manualMatch happy-path behavior', async () => {
    const res = buildResponse();

    await manualMatch(
      {
        body: { donation_id: '11111111-1111-4111-8111-111111111111', stripe_payment_intent_id: 'pi_123' },
        user: { id: 'user-1' },
        headers: { 'user-agent': 'jest-test-agent' },
        ip: '127.0.0.1',
      } as any,
      res
    );

    expect(mockService.manualMatch).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'pi_123',
      'user-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { message: 'Transaction matched successfully' },
        message: 'Transaction matched successfully',
      })
    );
  });

  it('maps manualMatch not_found to 404', async () => {
    mockService.manualMatch.mockRejectedValueOnce(Object.assign(new Error('Donation missing'), { code: 'not_found' }));

    const res = buildResponse();
    await manualMatch(
      {
        body: { donation_id: '11111111-1111-4111-8111-111111111111', stripe_payment_intent_id: 'pi_123' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps manualMatch no_op to 409', async () => {
    mockService.manualMatch.mockRejectedValueOnce(Object.assign(new Error('Already matched'), { code: 'no_op' }));

    const res = buildResponse();
    await manualMatch(
      {
        body: { donation_id: '11111111-1111-4111-8111-111111111111', stripe_payment_intent_id: 'pi_123' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('preserves resolveDiscrepancy happy-path behavior', async () => {
    const res = buildResponse();

    await resolveDiscrepancy(
      {
        params: { id: '11111111-1111-4111-8111-111111111111' },
        body: { resolution_notes: 'done', status: 'resolved' },
        user: { id: 'user-1' },
        headers: { 'user-agent': 'jest-test-agent' },
        ip: '127.0.0.1',
      } as any,
      res
    );

    expect(mockService.resolveDiscrepancy).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'resolved',
      'done',
      'user-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { message: 'Discrepancy resolved successfully' },
        message: 'Discrepancy resolved successfully',
      })
    );
  });

  it('maps resolveDiscrepancy not_found to 404', async () => {
    mockService.resolveDiscrepancy.mockRejectedValueOnce(
      Object.assign(new Error('Discrepancy missing'), { code: 'not_found' })
    );

    const res = buildResponse();
    await resolveDiscrepancy(
      {
        params: { id: '11111111-1111-4111-8111-111111111111' },
        body: { resolution_notes: 'done', status: 'resolved' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps resolveDiscrepancy no_op to 409', async () => {
    mockService.resolveDiscrepancy.mockRejectedValueOnce(
      Object.assign(new Error('Already resolved'), { code: 'no_op' })
    );

    const res = buildResponse();
    await resolveDiscrepancy(
      {
        params: { id: '11111111-1111-4111-8111-111111111111' },
        body: { resolution_notes: 'done', status: 'resolved' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('preserves assignDiscrepancy happy-path behavior', async () => {
    const res = buildResponse();

    await assignDiscrepancy(
      {
        params: { id: '11111111-1111-4111-8111-111111111111' },
        body: { assigned_to: '22222222-2222-4222-8222-222222222222', due_date: '2026-04-30' },
        user: { id: 'user-1' },
        headers: { 'user-agent': 'jest-test-agent' },
        ip: '127.0.0.1',
      } as any,
      res
    );

    expect(mockService.assignDiscrepancy).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '2026-04-30'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { message: 'Discrepancy assigned successfully' },
        message: 'Discrepancy assigned successfully',
      })
    );
  });

  it('maps assignDiscrepancy not_found to 404', async () => {
    mockService.assignDiscrepancy.mockRejectedValueOnce(
      Object.assign(new Error('Discrepancy missing'), { code: 'not_found' })
    );

    const res = buildResponse();
    await assignDiscrepancy(
      {
        params: { id: '11111111-1111-4111-8111-111111111111' },
        body: { assigned_to: '22222222-2222-4222-8222-222222222222' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps assignDiscrepancy no_op to 409', async () => {
    mockService.assignDiscrepancy.mockRejectedValueOnce(
      Object.assign(new Error('Already assigned'), { code: 'no_op' })
    );

    const res = buildResponse();
    await assignDiscrepancy(
      {
        params: { id: '11111111-1111-4111-8111-111111111111' },
        body: { assigned_to: '22222222-2222-4222-8222-222222222222' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
