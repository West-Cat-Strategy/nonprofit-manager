import pool from '@config/database';
import { approvePendingRegistration } from '../../usecases/approveRegistrationUseCase';
import { rejectPendingRegistration } from '../../usecases/rejectRegistrationUseCase';
import * as repo from '../../repositories/pendingRegistrationRepository';
import { getRegistrationSettings } from '../../usecases/registrationSettingsUseCase';
import { syncUserRole } from '@services/domains/integration';
import { seedDefaultOrganizationAccess } from '@services/accountAccessService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
  withUserContextTransaction: jest.fn(async (userId: string, handler: (client: unknown) => Promise<unknown>) => {
    const module = jest.requireMock('@config/database') as {
      default: { connect: jest.Mock };
    };
    const client = await module.default.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/emailService', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@services/domains/integration', () => ({
  __esModule: true,
  syncUserRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@services/accountAccessService', () => ({
  seedDefaultOrganizationAccess: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../repositories/pendingRegistrationRepository', () => ({
  __esModule: true,
  getPendingRegistrationById: jest.fn(),
  findUserByEmail: jest.fn(),
  createRealUser: jest.fn(),
  attachPendingRegistrationCredentialsToUser: jest.fn(),
  updatePendingStatus: jest.fn(),
  deletePendingRegistrationPasskeyData: jest.fn(),
}));

jest.mock('../../usecases/registrationSettingsUseCase', () => ({
  __esModule: true,
  getRegistrationSettings: jest.fn(),
}));

describe('pending registration approval use cases', () => {
  const mockConnect = pool.connect as jest.Mock;
  const getPendingRegistrationByIdMock = repo.getPendingRegistrationById as jest.Mock;
  const findUserByEmailMock = repo.findUserByEmail as jest.Mock;
  const createRealUserMock = repo.createRealUser as jest.Mock;
  const attachPendingRegistrationCredentialsToUserMock =
    repo.attachPendingRegistrationCredentialsToUser as jest.Mock;
  const updatePendingStatusMock = repo.updatePendingStatus as jest.Mock;
  const deletePendingRegistrationPasskeyDataMock =
    repo.deletePendingRegistrationPasskeyData as jest.Mock;
  const getRegistrationSettingsMock = getRegistrationSettings as jest.Mock;
  const syncUserRoleMock = syncUserRole as jest.Mock;
  const seedDefaultOrganizationAccessMock = seedDefaultOrganizationAccess as jest.Mock;

  const pendingRow = {
    id: 'pending-1',
    email: 'pending@example.com',
    password_hash: 'hashed-password',
    first_name: 'Pending',
    last_name: 'Person',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: new Date('2026-04-16T00:00:00.000Z'),
    updated_at: new Date('2026-04-16T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue({
      query: jest.fn(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }

        if (sql.includes("set_config('app.current_user_id'")) {
          return { rows: [{ set_config: 'reviewer-1' }] };
        }

        return { rows: [] };
      }),
      release: jest.fn(),
    });
    getPendingRegistrationByIdMock.mockResolvedValue(pendingRow);
    findUserByEmailMock.mockResolvedValue(null);
    createRealUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'pending@example.com',
      first_name: 'Pending',
      last_name: 'Person',
      role: 'staff',
    });
    attachPendingRegistrationCredentialsToUserMock.mockResolvedValue(0);
    updatePendingStatusMock.mockResolvedValue({
      ...pendingRow,
      status: 'approved',
      reviewed_by: 'reviewer-1',
    });
    deletePendingRegistrationPasskeyDataMock.mockResolvedValue(undefined);
    getRegistrationSettingsMock.mockResolvedValue({
      id: 'registration-settings-1',
      registrationMode: 'approval_required',
      defaultRole: 'staff',
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    });
    syncUserRoleMock.mockResolvedValue(undefined);
    seedDefaultOrganizationAccessMock.mockResolvedValue('org-1');
  });

  it('sets transaction audit context before approving a pending registration and attributes the created user', async () => {
    const client = await mockConnect();
    const clientQuery = client.query as jest.Mock;

    await expect(approvePendingRegistration('pending-1', 'reviewer-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'pending@example.com',
        first_name: 'Pending',
        last_name: 'Person',
        role: 'staff',
      },
    });

    expect(clientQuery.mock.calls[0]).toEqual(['BEGIN']);
    expect(clientQuery.mock.calls[1]).toEqual([
      "SELECT set_config('app.current_user_id', $1, true)",
      ['reviewer-1'],
    ]);
    expect(createRealUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'pending@example.com',
        role: 'staff',
        createdBy: 'reviewer-1',
        modifiedBy: 'reviewer-1',
      }),
      client
    );
    expect(syncUserRoleMock).toHaveBeenCalledWith('user-1', 'staff', client);
    expect(seedDefaultOrganizationAccessMock).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        role: 'staff',
        grantedBy: 'reviewer-1',
      },
      client
    );
  });

  it('sets transaction audit context before rejecting a pending registration', async () => {
    const client = await mockConnect();
    const clientQuery = client.query as jest.Mock;
    updatePendingStatusMock.mockResolvedValueOnce({
      ...pendingRow,
      status: 'rejected',
      reviewed_by: 'reviewer-1',
      rejection_reason: 'Missing verification',
    });

    await expect(
      rejectPendingRegistration('pending-1', 'reviewer-1', 'Missing verification')
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'rejected',
        reviewed_by: 'reviewer-1',
        rejection_reason: 'Missing verification',
      })
    );

    expect(clientQuery.mock.calls[0]).toEqual(['BEGIN']);
    expect(clientQuery.mock.calls[1]).toEqual([
      "SELECT set_config('app.current_user_id', $1, true)",
      ['reviewer-1'],
    ]);
    expect(deletePendingRegistrationPasskeyDataMock).toHaveBeenCalledWith('pending-1', client);
    expect(updatePendingStatusMock).toHaveBeenCalledWith(
      'pending-1',
      'rejected',
      'reviewer-1',
      'Missing verification',
      client
    );
  });
});
