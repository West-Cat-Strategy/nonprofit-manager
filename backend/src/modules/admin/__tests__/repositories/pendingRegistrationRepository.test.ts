import pool from '@config/database';
import {
  getActiveAdminRecipientById,
  listAdminRecipients,
} from '../../repositories/pendingRegistrationRepository';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

describe('pendingRegistrationRepository admin recipient lookup', () => {
  const queryMock = pool.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists active admin recipients with identity fields', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'admin-1',
          email: 'admin@example.com',
          first_name: 'Ada',
          last_name: 'Admin',
        },
      ],
    });

    await expect(listAdminRecipients()).resolves.toEqual([
      {
        id: 'admin-1',
        email: 'admin@example.com',
        first_name: 'Ada',
        last_name: 'Admin',
      },
    ]);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE role = 'admin' AND COALESCE(is_active, true) = true")
    );
  });

  it('returns a single active admin recipient by id', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'admin-1',
          email: 'admin@example.com',
          first_name: 'Ada',
          last_name: 'Admin',
        },
      ],
    });

    await expect(getActiveAdminRecipientById('admin-1')).resolves.toEqual({
      id: 'admin-1',
      email: 'admin@example.com',
      first_name: 'Ada',
      last_name: 'Admin',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['admin-1']);
  });
});
