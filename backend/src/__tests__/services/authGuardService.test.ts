import type { Response } from 'express';
import pool from '@config/database';
import type { AuthRequest } from '@middleware/auth';
import {
  guardWithPermission,
  guardWithRole,
  requireActiveOrganizationSafe,
  requirePermissionSafe,
  requireUserSafe,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';

const mockUnauthorized = jest.fn();
const mockForbidden = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@utils/responseHelpers', () => ({
  unauthorized: (...args: unknown[]) => mockUnauthorized(...args),
  forbidden: (...args: unknown[]) => mockForbidden(...args),
}));

describe('authGuardService', () => {
  const mockQuery = pool.query as jest.Mock;
  const baseUser = {
    id: 'user-1',
    email: 'guard-test@example.com',
    role: 'viewer',
  };

  const buildRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
    ({
      user: baseUser,
      ...overrides,
    }) as AuthRequest;

  const buildResponse = (): Response => ({}) as Response;

  beforeEach(() => {
    mockQuery.mockReset();
    mockUnauthorized.mockReset();
    mockForbidden.mockReset();
  });

  describe('requireUserSafe', () => {
    it('returns the authenticated user when present', () => {
      const result = requireUserSafe(buildRequest());

      expect(result).toEqual({
        ok: true,
        data: {
          user: baseUser,
        },
      });
    });

    it('returns a canonical unauthorized error when the user is missing', () => {
      const result = requireUserSafe(buildRequest({ user: undefined }));

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'Unauthorized: No authenticated user',
          statusCode: 401,
        },
      });
    });
  });

  describe('requirePermissionSafe', () => {
    it('grants permission when an authorization-context role allows it', () => {
      const result = requirePermissionSafe(
        buildRequest({
          authorizationContext: {
            userId: baseUser.id,
            primaryRole: 'viewer',
            roles: ['viewer', 'manager'],
            hydratedAt: new Date().toISOString(),
          },
        }),
        Permission.EVENT_CREATE
      );

      expect(result).toEqual({
        ok: true,
        data: {
          user: baseUser,
        },
      });
    });

    it('returns a canonical forbidden error when no candidate role grants the permission', () => {
      const result = requirePermissionSafe(buildRequest(), Permission.ADMIN_USERS);

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'forbidden',
          message: `Forbidden: Permission '${Permission.ADMIN_USERS}' not granted`,
          statusCode: 403,
        },
      });
    });

    it('returns the missing-user error before checking permissions', () => {
      const result = requirePermissionSafe(
        buildRequest({ user: undefined }),
        Permission.EVENT_VIEW
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'Unauthorized: No authenticated user',
          statusCode: 401,
        },
      });
    });
  });

  describe('requireActiveOrganizationSafe', () => {
    it('short-circuits when an active validated organization context is already attached', async () => {
      const result = await requireActiveOrganizationSafe(
        buildRequest({
          organizationId: 'org-1',
          organizationContextValidated: {
            organizationId: 'org-1',
            isActive: true,
            accessValidated: true,
          },
        })
      );

      expect(result).toEqual({
        ok: true,
        data: {
          user: baseUser,
          organizationId: 'org-1',
        },
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns an unauthorized error when the request has no user', async () => {
      const result = await requireActiveOrganizationSafe(buildRequest({ user: undefined }));

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'Unauthorized: No authenticated user',
          statusCode: 401,
        },
      });
    });

    it('returns a bad-request error when organization context is missing', async () => {
      const result = await requireActiveOrganizationSafe(
        buildRequest({
          organizationId: undefined,
          accountId: undefined,
          tenantId: undefined,
        })
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'bad_request',
          message: 'Bad Request: No organization context',
          statusCode: 400,
        },
      });
    });

    it('returns not-found when the organization context cannot be resolved', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await requireActiveOrganizationSafe(
        buildRequest({ organizationId: 'missing-org' })
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM accounts'),
        ['missing-org']
      );
      expect(result).toEqual({
        ok: false,
        error: {
          code: 'not_found',
          message: 'Organization context not found',
          statusCode: 404,
        },
      });
    });

    it('returns forbidden when the organization exists but is inactive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ is_active: false }] });

      const result = await requireActiveOrganizationSafe(
        buildRequest({ organizationId: 'inactive-org' })
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'forbidden',
          message: 'Organization is inactive',
          statusCode: 403,
        },
      });
    });

    it('returns the active organization id after a successful lookup', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ is_active: true }] });

      const result = await requireActiveOrganizationSafe(
        buildRequest({ organizationId: 'active-org' })
      );

      expect(result).toEqual({
        ok: true,
        data: {
          user: baseUser,
          organizationId: 'active-org',
        },
      });
    });
  });

  describe('guardWithRole', () => {
    it('authorizes a request when any resolved role matches', () => {
      const result = guardWithRole(
        buildRequest({
          authorizationContext: {
            userId: baseUser.id,
            primaryRole: 'viewer',
            roles: ['viewer', 'manager'],
            hydratedAt: new Date().toISOString(),
          },
        }),
        buildResponse(),
        'admin',
        'manager'
      );

      expect(result).toBe(true);
      expect(mockUnauthorized).not.toHaveBeenCalled();
      expect(mockForbidden).not.toHaveBeenCalled();
    });

    it('sends the default unauthorized response when the request user is missing', () => {
      const res = buildResponse();

      const result = guardWithRole(buildRequest({ user: undefined }), res, 'admin');

      expect(result).toBe(false);
      expect(mockUnauthorized).toHaveBeenCalledWith(res, 'Unauthorized');
      expect(mockForbidden).not.toHaveBeenCalled();
    });

    it('sends the default forbidden response when no allowed role matches', () => {
      const res = buildResponse();

      const result = guardWithRole(buildRequest(), res, 'admin');

      expect(result).toBe(false);
      expect(mockForbidden).toHaveBeenCalledWith(res, 'Forbidden');
      expect(mockUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe('guardWithPermission', () => {
    it('authorizes a request when any resolved role grants the permission', () => {
      const result = guardWithPermission(
        buildRequest({
          authorizationContext: {
            userId: baseUser.id,
            primaryRole: 'viewer',
            roles: ['viewer', 'admin'],
            hydratedAt: new Date().toISOString(),
          },
        }),
        buildResponse(),
        Permission.ADMIN_USERS
      );

      expect(result).toBe(true);
      expect(mockUnauthorized).not.toHaveBeenCalled();
      expect(mockForbidden).not.toHaveBeenCalled();
    });

    it('propagates the missing-user unauthorized message to the response helper', () => {
      const res = buildResponse();

      const result = guardWithPermission(
        buildRequest({ user: undefined }),
        res,
        Permission.EVENT_VIEW
      );

      expect(result).toBe(false);
      expect(mockUnauthorized).toHaveBeenCalledWith(
        res,
        'Unauthorized: No authenticated user'
      );
      expect(mockForbidden).not.toHaveBeenCalled();
    });

    it('propagates the permission denial message to the forbidden response helper', () => {
      const res = buildResponse();

      const result = guardWithPermission(buildRequest(), res, Permission.ADMIN_USERS);

      expect(result).toBe(false);
      expect(mockForbidden).toHaveBeenCalledWith(
        res,
        `Forbidden: Permission '${Permission.ADMIN_USERS}' not granted`
      );
      expect(mockUnauthorized).not.toHaveBeenCalled();
    });
  });
});
