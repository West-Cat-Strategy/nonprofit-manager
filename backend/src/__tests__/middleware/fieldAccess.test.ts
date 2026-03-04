import pool from '@config/database';
import {
  checkFieldWriteAccess,
  clearFieldAccessCache,
  filterFieldAccess,
  logSensitiveFieldAccess,
  requirePermission,
} from '@middleware/fieldAccess';
import { logger } from '@config/logger';
import { decrypt, isEncrypted, maskData, maskEmail, maskPhone } from '@utils/encryption';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@utils/encryption', () => ({
  maskData: jest.fn((value: string) => `masked:${value}`),
  maskEmail: jest.fn((value: string) => `email:${value}`),
  maskPhone: jest.fn((value: string) => `phone:${value}`),
  decrypt: jest.fn((value: string) => `decrypted:${value}`),
  isEncrypted: jest.fn((value: string) => value === 'encrypted'),
}));

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

const createMockResponse = () => {
  const headers = new Map<string, unknown>();
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    getHeader: jest.fn((name: string) => headers.get(name.toLowerCase())),
    setHeader: jest.fn((name: string, value: unknown) => {
      headers.set(name.toLowerCase(), value);
      return undefined;
    }),
  };
};

describe('fieldAccess middleware', () => {
  const queryMock = pool.query as jest.MockedFunction<typeof pool.query>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearFieldAccessCache();
  });

  it('filterFieldAccess masks, decrypts, and omits fields based on rules', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { field_name: 'email', can_read: true, can_write: true, mask_on_read: true, mask_type: 'email' },
        { field_name: 'phone', can_read: true, can_write: true, mask_on_read: true, mask_type: 'phone' },
        { field_name: 'secret', can_read: true, can_write: false, mask_on_read: false, mask_type: null },
        { field_name: 'hidden', can_read: false, can_write: false, mask_on_read: false, mask_type: null },
      ],
    } as never);

    const req: any = {
      user: { id: 'user-1', role: 'manager' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('agent'),
    };
    const originalJson = jest.fn().mockReturnThis();
    const res: any = createMockResponse();
    res.json = originalJson;
    const next = jest.fn();

    const middleware = filterFieldAccess('contacts');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();

    const wrappedJson = res.json;
    wrappedJson({
      email: 'jane@example.com',
      phone: '5551112222',
      secret: 'encrypted',
      hidden: 'omit-me',
      name: 'Jane',
    });
    await flushAsync();

    expect(maskEmail).toHaveBeenCalledWith('jane@example.com');
    expect(maskPhone).toHaveBeenCalledWith('5551112222');
    expect(isEncrypted).toHaveBeenCalledWith('encrypted');
    expect(decrypt).toHaveBeenCalledWith('encrypted');
    expect(originalJson).toHaveBeenCalledWith({
      email: 'email:jane@example.com',
      phone: 'phone:5551112222',
      secret: 'decrypted:encrypted',
      name: 'Jane',
    });
  });

  it('filterFieldAccess applies default deny shape when no rules exist', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    const req: any = { user: { id: 'user-2', role: 'manager' } };
    const originalJson = jest.fn().mockReturnThis();
    const res: any = createMockResponse();
    res.json = originalJson;
    const next = jest.fn();

    const middleware = filterFieldAccess('contacts');
    await middleware(req, res, next);

    res.json({ email: 'test@example.com', phone: '5551112222' });
    await flushAsync();

    expect(logger.warn).toHaveBeenCalledWith(
      'No field access rules found; default deny applied',
      expect.objectContaining({ userId: 'user-2', resource: 'contacts' })
    );
    expect(originalJson).toHaveBeenCalledWith({});
  });

  it('filterFieldAccess caches rules and clearFieldAccessCache invalidates cached entries', async () => {
    queryMock.mockResolvedValue({
      rows: [{ field_name: 'name', can_read: true, can_write: true, mask_on_read: false, mask_type: null }],
    } as never);

    const req: any = { user: { id: 'cache-user', role: 'manager' } };
    const next = jest.fn();

    const resA: any = createMockResponse();
    await filterFieldAccess('contacts')(req, resA, next);
    resA.json({ name: 'A' });
    await flushAsync();

    const resB: any = createMockResponse();
    await filterFieldAccess('contacts')(req, resB, next);
    resB.json({ name: 'B' });
    await flushAsync();

    expect(queryMock).toHaveBeenCalledTimes(1);

    clearFieldAccessCache('cache-user');

    const resC: any = createMockResponse();
    await filterFieldAccess('contacts')(req, resC, next);
    resC.json({ name: 'C' });
    await flushAsync();

    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('checkFieldWriteAccess denies forbidden fields', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ field_name: 'email', can_read: true, can_write: false, mask_on_read: false, mask_type: null }],
    } as never);

    const req: any = { user: { id: 'user-1', role: 'manager' } };
    const res: any = createMockResponse();
    const next = jest.fn();

    await checkFieldWriteAccess('contacts', ['email', 'name'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Field write access denied',
      expect.objectContaining({ userId: 'user-1', resource: 'contacts', deniedFields: ['email'] })
    );
  });

  it('checkFieldWriteAccess allows admins and rejects unauthenticated users', async () => {
    const adminReq: any = { user: { id: 'admin-1', role: 'admin' } };
    const noUserReq: any = { user: undefined };
    const res: any = createMockResponse();
    const next = jest.fn();

    await checkFieldWriteAccess('contacts', ['email'])(adminReq, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    await checkFieldWriteAccess('contacts', ['email'])(noUserReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('requirePermission authorizes admins and enforces role permissions for non-admins', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ has_permission: true }] } as never)
      .mockResolvedValueOnce({ rows: [{ has_permission: false }] } as never);

    const res: any = createMockResponse();
    const next = jest.fn();

    await requirePermission('contacts.read')({ user: { id: 'admin-1', role: 'admin' } } as any, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    await requirePermission('contacts.read')({ user: { id: 'user-1', role: 'manager' } } as any, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    await requirePermission('contacts.write')({ user: { id: 'user-2', role: 'manager' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(logger.warn).toHaveBeenCalledWith(
      'Permission denied',
      expect.objectContaining({ userId: 'user-2', permissionName: 'contacts.write' })
    );
  });

  it('logSensitiveFieldAccess writes audit rows and swallows logging failures', async () => {
    const req: any = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    };

    queryMock.mockResolvedValueOnce({ rowCount: 1 } as never);
    await logSensitiveFieldAccess('user-1', 'contacts', 'contact-1', 'email', 'read', req);
    expect(queryMock).toHaveBeenCalled();

    queryMock.mockRejectedValueOnce(new Error('insert failed'));
    await logSensitiveFieldAccess('user-1', 'contacts', 'contact-1', 'email', 'read', req);
    expect(logger.error).toHaveBeenCalledWith(
      'Error logging sensitive field access',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('filterFieldAccess handles unexpected query failures without throwing', async () => {
    queryMock.mockRejectedValueOnce(new Error('db unavailable'));

    const req: any = {
      user: { id: 'user-error', role: 'manager' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('agent'),
    };
    const originalJson = jest.fn().mockReturnThis();
    const res: any = createMockResponse();
    res.json = originalJson;
    const next = jest.fn();

    await filterFieldAccess('contacts')(req, res, next);
    res.json([{ name: 'Example', email: 'example@test.com' }]);
    await flushAsync();

    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching field access rules',
      expect.objectContaining({ error: expect.any(Error), userId: 'user-error', resource: 'contacts' })
    );
    expect(originalJson).toHaveBeenCalledWith([{}]);
  });

  it('uses maskData default path for unrecognized mask type', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          field_name: 'account_number',
          can_read: true,
          can_write: true,
          mask_on_read: true,
          mask_type: 'unknown',
        },
      ],
    } as never);

    const req: any = { user: { id: 'user-mask', role: 'manager' } };
    const res: any = createMockResponse();

    await filterFieldAccess('accounts')(req, res, jest.fn());
    res.json({ account_number: '1234567890' });
    await flushAsync();

    expect(maskData).toHaveBeenCalledWith('1234567890', 4);
  });
});
