import pool from '@config/database';
import {
  findPendingByEmail,
  getActiveAdminRecipientById,
  getPendingRegistrationByIdForUpdate,
  listAdminRecipients,
  updatePendingStatusIfPending,
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

  it('finds only pending registrations by normalized email', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

    await expect(findPendingByEmail('Applicant@Example.com')).resolves.toBe('pending-1');

    expect(queryMock).toHaveBeenCalledWith(
      "SELECT id FROM pending_registrations WHERE lower(email) = lower($1) AND status = 'pending' LIMIT 1",
      ['Applicant@Example.com']
    );
  });

  it('locks pending registration rows for approval review', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ credentials_table: null, challenges_table: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'pending-1', status: 'pending' }] });

    await expect(getPendingRegistrationByIdForUpdate('pending-1')).resolves.toEqual({
      id: 'pending-1',
      status: 'pending',
    });

    expect(queryMock.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(queryMock.mock.calls[1][1]).toEqual(['pending-1']);
  });

  it('updates review status with a pending-only guard', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ credentials_table: null, challenges_table: null }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'pending-1', status: 'rejected', reviewed_by: 'admin-1' }],
      });

    await expect(
      updatePendingStatusIfPending('pending-1', 'rejected', 'admin-1', 'Duplicate request')
    ).resolves.toEqual({ id: 'pending-1', status: 'rejected', reviewed_by: 'admin-1' });

    expect(queryMock.mock.calls[1][0]).toContain("AND status = 'pending'");
    expect(queryMock.mock.calls[1][1]).toEqual([
      'rejected',
      'admin-1',
      'Duplicate request',
      'pending-1',
    ]);
  });
});
