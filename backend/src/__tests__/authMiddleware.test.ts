import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  return res;
};

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('rejects when no auth header is present', () => {
      const req = { headers: {} } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'No token provided' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects when token is invalid', () => {
      const req = {
        headers: { authorization: 'Bearer bad-token' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid');
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid or expired token' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('sets req.user and calls next for valid token', () => {
      const req = {
        headers: { authorization: 'Bearer good-token' },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      (jwt.verify as jest.Mock).mockReturnValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin',
      });

      authenticate(req, res, next);

      expect(req.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin',
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
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }));
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
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Forbidden: Insufficient permissions' }));
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
