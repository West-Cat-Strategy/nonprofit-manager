import type { Response } from 'express';
import { getAdminStats } from '../../controllers/adminStatsController';
import type { AuthRequest } from '../../middleware/auth';
import pool from '@config/database';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@utils/responseHelpers', () => ({
  serverError: jest.fn((res, message) => res.status(500).json({ error: message })),
}));

const mockedPool = pool as unknown as { query: jest.Mock };

const createResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('adminStatsController.getAdminStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zeroed stats when users table does not exist', async () => {
    mockedPool.query.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('to_regclass') && params?.[0] === 'public.users') {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      if (sql.includes('to_regclass')) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const req = { correlationId: 'corr-id' } as unknown as AuthRequest;
    const res = createResponse();

    await getAdminStats(req, res);

    expect(res.json).toHaveBeenCalledWith({
      totalUsers: 0,
      activeUsers: 0,
      totalContacts: 0,
      recentDonations: 0,
      recentSignups: [],
    });
  });

  it('falls back to is_active when users.last_login_at does not exist', async () => {
    mockedPool.query.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('to_regclass')) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      if (sql === 'SELECT COUNT(*) FROM users') {
        return Promise.resolve({ rows: [{ count: '10' }] });
      }
      if (sql === 'SELECT COUNT(*) FROM users WHERE is_active = true') {
        return Promise.resolve({ rows: [{ count: '7' }] });
      }
      if (sql === 'SELECT COUNT(*) FROM contacts') {
        return Promise.resolve({ rows: [{ count: '25' }] });
      }
      if (sql.includes('SELECT SUM(amount) FROM donations')) {
        return Promise.resolve({ rows: [{ sum: '250.50' }] });
      }
      if (sql.includes('SELECT id, email, created_at FROM users')) {
        return Promise.resolve({ rows: [{ id: 'u1', email: 'u1@example.com', created_at: new Date() }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const req = { correlationId: 'corr-id' } as unknown as AuthRequest;
    const res = createResponse();

    await getAdminStats(req, res);

    expect(mockedPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users WHERE is_active = true');
    expect(res.json).toHaveBeenCalledWith({
      totalUsers: 10,
      activeUsers: 7,
      totalContacts: 25,
      recentDonations: 250.5,
      recentSignups: expect.any(Array),
    });
  });
});

