import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { register, login } from '../controllers/authController';
import { AuthRequest } from '../middleware/auth';

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

      queryMock.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
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
      });

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
          token: expect.any(String),
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
      expect(queryMock).toHaveBeenCalledTimes(2);
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
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns token for valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      queryMock.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'login@example.com',
            password_hash: 'hashed-password',
            first_name: 'Login',
            last_name: 'User',
            role: 'user',
          },
        ],
      });

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
          token: expect.any(String),
          refreshToken: expect.any(String),
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
