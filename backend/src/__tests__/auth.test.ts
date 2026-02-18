import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { register, login } from '../controllers/authController';
import { AuthRequest } from '../middleware/auth';
import { getRegistrationMode } from '../services/registrationSettingsService';
import { createPendingRegistration } from '../services/pendingRegistrationService';

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

// Mock registration settings — default to allowing direct registration (not 'disabled')
// so the existing register tests continue to work as before.
jest.mock('../services/registrationSettingsService', () => ({
  __esModule: true,
  getRegistrationMode: jest.fn().mockResolvedValue('approval_required'),
}));

// Mock pending registration service used when mode is approval_required
jest.mock('../services/pendingRegistrationService', () => ({
  __esModule: true,
  createPendingRegistration: jest.fn().mockResolvedValue({
    id: 'pending-1',
    email: 'newuser@example.com',
    status: 'pending',
  }),
}));

describe('Auth API', () => {
  const queryMock = pool.query as jest.Mock;
  const validationResultMock = validationResult as unknown as jest.Mock;
  const originalBypassFlag = process.env.BYPASS_REGISTRATION_POLICY_IN_TEST;

  beforeEach(() => {
    queryMock.mockReset();
    validationResultMock.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
  });

  describe('register', () => {
    beforeEach(() => {
      process.env.BYPASS_REGISTRATION_POLICY_IN_TEST = 'false';
    });

    afterEach(() => {
      process.env.BYPASS_REGISTRATION_POLICY_IN_TEST = originalBypassFlag;
    });

    it('creates a pending registration when mode is approval_required', async () => {
      // getRegistrationMode mock already returns 'approval_required'
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

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingApproval: true,
        })
      );
      expect(createPendingRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'StrongP@ssw0rd',
          firstName: 'New',
          lastName: 'User',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects registration when mode is disabled', async () => {
      (getRegistrationMode as jest.Mock).mockResolvedValueOnce('disabled');

      const req = {
        body: {
          email: 'role-test@example.com',
          password: 'StrongP@ssw0rd',
          firstName: 'Role',
          lastName: 'Test',
        },
      } as AuthRequest;
      const res = createMockResponse() as unknown as Response;
      const next = jest.fn();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Registration is currently disabled' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns conflict when email already has a pending registration', async () => {
      (createPendingRegistration as jest.Mock).mockRejectedValueOnce(
        new Error('A registration request for this email is already pending')
      );

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
