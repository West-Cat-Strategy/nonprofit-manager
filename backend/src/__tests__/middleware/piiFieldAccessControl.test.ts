import type { NextFunction, Request, Response } from 'express';
import { auditPIIAccess, piiFieldAccessControl } from '@middleware/piiFieldAccessControl';
import { logger } from '@config/logger';

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

const createResponse = () => {
  const originalJson = jest.fn().mockReturnThis();
  const res = {
    status: jest.fn().mockReturnThis(),
    json: originalJson,
  } as unknown as Response;

  return {
    res,
    originalJson,
  };
};

describe('piiFieldAccessControl middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('masks sensitive fields recursively for authenticated users', async () => {
    const req = {
      user: { id: 'user-1', email: 'user@example.com', role: 'manager' },
    } as unknown as Request;
    const { res, originalJson } = createResponse();
    const next = jest.fn() as NextFunction;

    await piiFieldAccessControl({} as any)(req as any, res, next);
    expect(next).toHaveBeenCalled();

    (res.json as any)({
      email: 'alice@example.com',
      phone: '6045551234',
      token: 'abcd',
      nested: { mobile_phone: '7785559999' },
      items: [{ emergency_contact_phone: '2504443333' }],
    });

    expect(originalJson).toHaveBeenCalledWith({
      email: 'a***@example.com',
      phone: '***-***-1234',
      token: 'a***',
      nested: { mobile_phone: '***-***-9999' },
      items: [{ emergency_contact_phone: '***-***-3333' }],
    });
  });

  it('passes data through unchanged when user role is unavailable', async () => {
    const req = {
      user: undefined,
    } as unknown as Request;
    const { res, originalJson } = createResponse();

    await piiFieldAccessControl({} as any)(req as any, res, jest.fn() as NextFunction);
    (res.json as any)({ email: 'plain@example.com', phone: '1112223333' });

    expect(originalJson).toHaveBeenCalledWith({ email: 'plain@example.com', phone: '1112223333' });
  });
});

describe('auditPIIAccess middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audits sensitive access events for known entity routes', async () => {
    const piiService = {
      auditPIIAccess: jest.fn().mockResolvedValue(undefined),
    };
    const req = {
      user: { id: 'user-1', email: 'user@example.com', role: 'manager' },
      method: 'GET',
      path: '/contacts/123e4567-e89b-12d3-a456-426614174000',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
    } as unknown as Request;
    const { res } = createResponse();

    await auditPIIAccess(piiService as any)(req as any, res, jest.fn() as NextFunction);
    (res.json as any)({ email: 'audited@example.com' });
    await flushAsync();

    expect(piiService.auditPIIAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: 'contacts',
        record_id: '123e4567-e89b-12d3-a456-426614174000',
        accessed_by: 'user-1',
        access_type: 'read',
      }),
      'user-1',
      '127.0.0.1',
      'jest-agent'
    );
  });

  it('does not audit when response has no sensitive fields', async () => {
    const piiService = {
      auditPIIAccess: jest.fn().mockResolvedValue(undefined),
    };
    const req = {
      user: { id: 'user-1', email: 'user@example.com', role: 'manager' },
      method: 'GET',
      path: '/contacts/123e4567-e89b-12d3-a456-426614174000',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
    } as unknown as Request;
    const { res } = createResponse();

    await auditPIIAccess(piiService as any)(req as any, res, jest.fn() as NextFunction);
    (res.json as any)({ title: 'No sensitive values' });
    await flushAsync();

    expect(piiService.auditPIIAccess).not.toHaveBeenCalled();
  });

  it('logs errors when async audit writes fail', async () => {
    const piiService = {
      auditPIIAccess: jest.fn().mockRejectedValue(new Error('audit down')),
    };
    const req = {
      user: { id: 'user-1', email: 'user@example.com', role: 'manager' },
      method: 'GET',
      path: '/contacts/123e4567-e89b-12d3-a456-426614174000',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
    } as unknown as Request;
    const { res } = createResponse();

    await auditPIIAccess(piiService as any)(req as any, res, jest.fn() as NextFunction);
    (res.json as any)({ email: 'error@example.com' });
    await flushAsync();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to audit PII access',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
