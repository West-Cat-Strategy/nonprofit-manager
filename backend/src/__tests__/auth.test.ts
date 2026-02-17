import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { register, login } from '../controllers/authController';
import { AuthRequest } from '../middleware/auth';

jest.mock('../services/userRoleService', () => ({
  __esModule: true,
  syncUserRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

jest.mock('../middleware/accountLockout', () => ({
  trackLoginAttempt: jest.fn().mockResolvedValue(undefined),
  isAccountLocked: jest.fn().mockResolvedValue({ locked: false }),
}));

jest.mock('../utils/cookieHelper', () => ({
  setAuthCookie: jest.fn(),
  setRefreshCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
}));

jest.mock('../utils/authResponse', () => ({
  buildAuthTokenResponse: jest.fn().mockReturnValue({}),
  shouldExposeAuthTokensInResponse: jest.fn().mockReturnValue(false),
}));

jest.mock('../middleware/csrf', () => ({
  generateCsrfToken: jest.fn().mockReturnValue('mock-csrf-token'),
  doubleCsrfProtection: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

describe('Auth API', () => {
  const queryMock = pool.query as jest.Mock;
  const validationResultMock = validationResult as unknown as jest.Mock;

  beforeEach(() => {
    queryMock.mockReset();
    validationResultMock.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
  });

  describe('register', () => {
    it('creates a user when email is new', async () => {
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);

      queryMock
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-1',
              email: 'newuser@example.com',
              first_name: 'New',
              last_name: 'User',
              role: 'user',
              created_at: new Date(),
            },
          ],
        }) // Insert user
        .mockResolvedValueOnce({ rows: [{ id: 'org-1' }] }); // Get default organization

      const req = {
        body: {
          email: 'newuser@example.com',
          password: 'StrongP@ssw0rd',
          firstName: 'New',
          lastName: 'User',
        },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            user_id: 'user-1',
            email: 'newuser@example.com',
            firstName: 'New',
            lastName: 'User',
            role: 'user',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
      expect(queryMock).toHaveBeenCalledTimes(3);
    });

    it('ignores requested role and defaults to user', async () => {
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);

      queryMock
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-2',
              email: 'role-test@example.com',
              first_name: 'Role',
              last_name: 'Test',
              role: 'user',
              created_at: new Date(),
            },
          ],
        }) // Insert user
        .mockResolvedValueOnce({ rows: [{ id: 'org-1' }] }); // Get default organization

      const req = {
        body: {
          email: 'role-test@example.com',
          password: 'StrongP@ssw0rd',
          firstName: 'Role',
          lastName: 'Test',
          role: 'admin',
        },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            role: 'user',
          }),
        })
      );
      expect(queryMock.mock.calls[1][1][4]).toBe('user');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects registration when email already exists', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

      const req = {
        body: {
          email: 'existing@example.com',
          password: 'StrongP@ssw0rd',
          firstName: 'Existing',
          lastName: 'User',
        },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'User already exists', code: 'conflict' })
      );
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns token for valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      queryMock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-1',
              email: 'login@example.com',
              password_hash: 'hashed-password',
              first_name: 'Login',
              last_name: 'User',
              role: 'user',
              mfa_totp_enabled: false,
            },
          ],
        }) // Get user
        .mockResolvedValueOnce({ rows: [{ id: 'org-1' }] }); // Get default organization

      const req = {
        body: {
          email: 'login@example.com',
          password: 'StrongP@ssw0rd',
        },
        ip: '127.0.0.1',
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await login(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          user: expect.objectContaining({
            id: 'user-1',
            email: 'login@example.com',
            firstName: 'Login',
            lastName: 'User',
            role: 'user',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      queryMock.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'login@example.com',
            password_hash: 'hashed-password',
            first_name: 'Login',
            last_name: 'User',
            role: 'user',
            mfa_totp_enabled: false,
          },
        ],
      });

      const req = {
        body: {
          email: 'login@example.com',
          password: 'WrongP@ssw0rd',
        },
        ip: '127.0.0.1',
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid credentials', code: 'unauthorized' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});

const createMockResponse = () => {
  const res: Record<string, jest.Mock | (() => undefined)> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  return res;
};
