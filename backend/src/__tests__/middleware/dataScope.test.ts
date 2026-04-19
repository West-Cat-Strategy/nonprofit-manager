import type { Response } from 'express';
import pool from '@config/database';
import { loadDataScope } from '@middleware/dataScope';
import type { AuthRequest } from '@middleware/auth';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

describe('dataScope middleware', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('attaches the first matching data scope for non-admin users', async () => {
    const req = {
      user: { id: 'user-1', role: 'staff' },
    } as AuthRequest;
    const res = createMockResponse();
    const next = jest.fn();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'scope-1',
          scope_filter: { accountIds: ['account-1'], contactIds: ['contact-1'] },
        },
      ],
    });

    await loadDataScope('contacts')(req, res, next);

    expect(req.dataScope).toEqual({
      resource: 'contacts',
      scopeId: 'scope-1',
      filter: {
        accountIds: ['account-1'],
        contactIds: ['contact-1'],
      },
    });
    expect(next).toHaveBeenCalled();
  });

  it('returns a distinct server error when data-scope lookup fails', async () => {
    const req = {
      user: { id: 'user-1', role: 'staff' },
      correlationId: 'corr-1',
    } as AuthRequest;
    const res = createMockResponse();
    const next = jest.fn();

    mockQuery.mockRejectedValueOnce(new Error('db unavailable'));

    await loadDataScope('contacts')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'data_scope_lookup_failed',
          message: 'Failed to load data scope',
          details: {
            resource: 'contacts',
          },
        }),
        correlationId: 'corr-1',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
