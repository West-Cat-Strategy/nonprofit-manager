import { Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('@utils/sessionTokens', () => ({
  APP_SESSION_TOKEN_ISSUER: 'nonprofit-manager-app',
  verifyTokenWithOptionalIssuer: jest.fn(),
}));

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const pool = jest.requireMock('@config/database').default as {
  query: jest.Mock;
};
const { verifyTokenWithOptionalIssuer } = jest.requireMock('@utils/sessionTokens') as {
  verifyTokenWithOptionalIssuer: jest.Mock;
};

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('rejects when no auth header is present', async () => {
      const req = { headers: {} } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'unauthorized',
            message: 'No token provided',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects when token is invalid', async () => {
      const req = {
        headers: { authorization: 'Bearer bad-token' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      verifyTokenWithOptionalIssuer.mockImplementation(() => {
        throw new Error('invalid');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'unauthorized',
            message: 'Invalid or expired token',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects portal tokens on staff routes', async () => {
      const req = {
        headers: { authorization: 'Bearer portal-token' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      verifyTokenWithOptionalIssuer.mockReturnValue({
        id: 'user-1',
        email: 'portal@example.com',
        role: 'member',
        type: 'portal',
      });

      await authenticate(req, res, next);

      expect(pool.query).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects tokens when the auth revision no longer matches', async () => {
      const req = {
        headers: { authorization: 'Bearer stale-token' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      verifyTokenWithOptionalIssuer.mockReturnValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin',
        type: 'app',
        authRevision: 0,
      });
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'db@example.com',
            role: 'manager',
            is_active: true,
            auth_revision: 3,
          },
        ],
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('sets req.user from the database snapshot and calls next for valid tokens', async () => {
      const req = {
        headers: { authorization: 'Bearer good-token' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      verifyTokenWithOptionalIssuer.mockReturnValue({
        id: 'user-1',
        email: 'token@example.com',
        role: 'admin',
        type: 'app',
        authRevision: 2,
      });
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'db@example.com',
            role: 'manager',
            is_active: true,
            auth_revision: 2,
          },
        ],
      });

      await authenticate(req, res, next);

      expect(req.user).toEqual({
        id: 'user-1',
        email: 'db@example.com',
        role: 'manager',
        type: 'app',
        authRevision: 2,
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('rejects when no user is present', () => {
      const req = {} as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      authorize('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'unauthorized',
            message: 'Unauthorized',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects when user role is not allowed', () => {
      const req = {
        user: { id: 'user-1', email: 'test@example.com', role: 'user' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      authorize('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'forbidden',
            message: 'Forbidden: Insufficient permissions',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when user role is allowed', () => {
      const req = {
        user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      authorize('admin', 'manager')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
