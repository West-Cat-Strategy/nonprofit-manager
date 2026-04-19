import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { authorize } from '@middleware/auth';
import {
  requireAnyPermission,
  requirePermission,
  requireRole,
} from '@middleware/permissions';
import { Permission } from '@utils/permissions';

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

const buildRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    user: {
      id: 'user-1',
      email: 'staff@example.com',
      role: 'staff',
      type: 'app',
    },
    ...overrides,
  }) as AuthRequest;

describe('permissions middleware parity', () => {
  it('keeps role middleware and authorize aligned for missing users', () => {
    const req = buildRequest({ user: undefined });
    const roleRes = createMockResponse();
    const authorizeRes = createMockResponse();
    const next = jest.fn();

    requireRole('admin')(req, roleRes, next);
    authorize('admin')(req, authorizeRes, next);

    expect(roleRes.status).toHaveBeenCalledWith(401);
    expect(authorizeRes.status).toHaveBeenCalledWith(401);
    expect((roleRes.json as jest.Mock).mock.calls[0][0]).toEqual(
      (authorizeRes.json as jest.Mock).mock.calls[0][0]
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps role middleware and authorize aligned for forbidden roles', () => {
    const req = buildRequest();
    const roleRes = createMockResponse();
    const authorizeRes = createMockResponse();
    const next = jest.fn();

    requireRole('admin')(req, roleRes, next);
    authorize('admin')(req, authorizeRes, next);

    expect(roleRes.status).toHaveBeenCalledWith(403);
    expect(authorizeRes.status).toHaveBeenCalledWith(403);
    expect((roleRes.json as jest.Mock).mock.calls[0][0]).toEqual(
      (authorizeRes.json as jest.Mock).mock.calls[0][0]
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('honors resolved authorization-context roles in permission middleware', () => {
    const req = buildRequest({
      authorizationContext: {
        userId: 'user-1',
        primaryRole: 'staff',
        roles: ['viewer', 'manager'],
        hydratedAt: new Date().toISOString(),
      },
    });
    const res = createMockResponse();
    const next = jest.fn();

    requirePermission(Permission.EVENT_CREATE)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns the canonical any-permission denial contract', () => {
    const req = buildRequest();
    const res = createMockResponse();
    const next = jest.fn();

    requireAnyPermission(Permission.ADMIN_USERS, Permission.ANALYTICS_EXPORT)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'forbidden',
          message: `Forbidden: Requires one of [${Permission.ADMIN_USERS}, ${Permission.ANALYTICS_EXPORT}]`,
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
