import pool from '@config/database';
import {
  countActiveAdmins,
  createUser,
  getUserById,
  getUserIdentityById,
  listUsers,
  updateUser,
} from '@services/userManagementService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

describe('userManagementService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('lists users with mapped row payload', async () => {
    const row = {
      id: 'u1',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      profile_picture: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await listUsers({ search: 'admin' });
    expect(result).toEqual([row]);
  });

  it('returns null when user is not found by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getUserById('missing')).resolves.toBeNull();
  });

  it('creates a user row', async () => {
    const row = {
      id: 'u2',
      email: 'new@example.com',
      first_name: 'New',
      last_name: 'User',
      role: 'user',
      profile_picture: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await createUser({
      email: row.email,
      passwordHash: 'hash',
      firstName: 'New',
      lastName: 'User',
      role: 'user',
      createdBy: 'admin-id',
    });

    expect(result).toEqual(row);
  });

  it('parses active admin count as number', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
    await expect(countActiveAdmins()).resolves.toBe(3);
  });

  it('returns null when update affects no row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateUser({ id: 'u1', modifiedBy: 'admin-id' })
    ).resolves.toBeNull();
  });

  it('returns user identity by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@b.com' }] });
    await expect(getUserIdentityById('u1')).resolves.toEqual({ id: 'u1', email: 'a@b.com' });
  });
});
