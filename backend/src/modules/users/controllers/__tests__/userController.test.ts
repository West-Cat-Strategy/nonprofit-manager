import type { NextFunction, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthRequest } from '@middleware/auth';
import {
  createUser,
  deleteUser,
  resetUserPassword,
  updateUser,
} from '../userController';
import {
  getAccountLockoutStatus,
  setAccountLockState,
} from '@middleware/accountLockout';
import { syncUserRole } from '@services/domains/integration';
import {
  getUserAccessOverview,
  seedDefaultOrganizationAccess,
} from '@services/accountAccessService';
import * as userManagementService from '@services/userManagementService';
import { badRequest, conflict } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@middleware/accountLockout', () => ({
  __esModule: true,
  getAccountLockoutStatus: jest.fn(),
  setAccountLockState: jest.fn(),
}));

jest.mock('@services/domains/integration', () => ({
  __esModule: true,
  syncUserRole: jest.fn(),
}));

jest.mock('@services/accountAccessService', () => ({
  __esModule: true,
  getUserAccessOverview: jest.fn(),
  getUsersAccessOverview: jest.fn(),
  seedDefaultOrganizationAccess: jest.fn(),
}));

jest.mock('@modules/admin/usecases/roleCatalogUseCase', () => ({
  __esModule: true,
  getRoleSelectorItems: jest.fn(),
}));

jest.mock('@services/userManagementService', () => ({
  __esModule: true,
  findUserByEmail: jest.fn(),
  findUserByEmailExcludingId: jest.fn(),
  createUser: jest.fn(),
  getUserRoleIdentityById: jest.fn(),
  countActiveAdmins: jest.fn(),
  updateUser: jest.fn(),
  getUserIdentityById: jest.fn(),
  updateUserPassword: jest.fn(),
  deactivateUser: jest.fn(),
}));

jest.mock('@utils/responseHelpers', () => ({
  __esModule: true,
  badRequest: jest.fn(),
  conflict: jest.fn(),
  notFoundMessage: jest.fn(),
}));

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendSuccess: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockGetAccountLockoutStatus = getAccountLockoutStatus as jest.MockedFunction<
  typeof getAccountLockoutStatus
>;
const mockSetAccountLockState = setAccountLockState as jest.MockedFunction<
  typeof setAccountLockState
>;
const mockSyncUserRole = syncUserRole as jest.MockedFunction<typeof syncUserRole>;
const mockGetUserAccessOverview = getUserAccessOverview as jest.MockedFunction<
  typeof getUserAccessOverview
>;
const mockSeedDefaultOrganizationAccess =
  seedDefaultOrganizationAccess as jest.MockedFunction<typeof seedDefaultOrganizationAccess>;
const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockConflict = conflict as jest.MockedFunction<typeof conflict>;

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    user: { id: 'admin-1' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as AuthRequest);

const createResponse = (): Response => ({}) as Response;
const createNext = (): NextFunction => jest.fn();

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAccessOverview.mockResolvedValue({
      groups: [],
      organizationAccess: [],
      mfaTotpEnabled: false,
      passkeyCount: 0,
    } as Awaited<ReturnType<typeof getUserAccessOverview>>);
    mockGetAccountLockoutStatus.mockResolvedValue({
      failedLoginAttempts: 0,
      isLocked: false,
    } as Awaited<ReturnType<typeof getAccountLockoutStatus>>);
  });

  it('returns a conflict when creating a user for an existing email address', async () => {
    const req = createRequest({
      body: {
        email: 'admin@example.com',
        password: 'StrongPass123',
        firstName: 'Admin',
        lastName: 'User',
      },
    });
    const res = createResponse();
    const next = createNext();

    (userManagementService.findUserByEmail as jest.Mock).mockResolvedValueOnce('user-1');

    await createUser(req, res, next);

    expect(mockConflict).toHaveBeenCalledWith(res, 'User with this email already exists');
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('creates a user, syncs role access, and returns the serialized user payload', async () => {
    const createdUser = {
      id: 'user-2',
      email: 'staff@example.com',
      first_name: 'Staff',
      last_name: 'Member',
      role: 'staff',
      profile_picture: null,
      is_active: true,
      created_at: new Date('2026-04-18T00:00:00.000Z'),
      updated_at: new Date('2026-04-18T00:00:00.000Z'),
    };
    const req = createRequest({
      body: {
        email: 'staff@example.com',
        password: 'StrongPass123',
        firstName: 'Staff',
        lastName: 'Member',
        role: 'staff',
      },
    });
    const res = createResponse();
    const next = createNext();

    (userManagementService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);
    mockBcrypt.hash.mockResolvedValueOnce('hashed-password');
    (userManagementService.createUser as jest.Mock).mockResolvedValueOnce(createdUser);

    await createUser(req, res, next);

    expect(userManagementService.createUser).toHaveBeenCalledWith({
      email: 'staff@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Staff',
      lastName: 'Member',
      role: 'staff',
      createdBy: 'admin-1',
    });
    expect(mockSyncUserRole).toHaveBeenCalledWith('user-2', 'staff');
    expect(mockSeedDefaultOrganizationAccess).toHaveBeenCalledWith({
      userId: 'user-2',
      role: 'staff',
      grantedBy: 'admin-1',
    });
    expect(mockSendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        id: 'user-2',
        email: 'staff@example.com',
        role: 'staff',
        groups: [],
        organizationAccess: [],
      }),
      201
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('prevents demoting the last active admin user', async () => {
    const req = createRequest({
      params: { id: 'admin-2' },
      body: {
        role: 'staff',
      },
    });
    const res = createResponse();
    const next = createNext();

    (userManagementService.getUserRoleIdentityById as jest.Mock).mockResolvedValueOnce({
      id: 'admin-2',
      email: 'admin@example.com',
      role: 'admin',
    });
    (userManagementService.countActiveAdmins as jest.Mock).mockResolvedValueOnce(1);

    await updateUser(req, res, next);

    expect(mockBadRequest).toHaveBeenCalledWith(res, 'Cannot demote the last admin user');
    expect(userManagementService.updateUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rekeys lock state and re-syncs roles when a user email and role change', async () => {
    const updatedUser = {
      id: 'user-3',
      email: 'new@example.com',
      first_name: 'Updated',
      last_name: 'User',
      role: 'manager',
      profile_picture: null,
      is_active: true,
      created_at: new Date('2026-04-18T00:00:00.000Z'),
      updated_at: new Date('2026-04-18T00:00:00.000Z'),
    };
    const req = createRequest({
      params: { id: 'user-3' },
      body: {
        email: 'new@example.com',
        role: 'manager',
        isLocked: true,
      },
    });
    const res = createResponse();
    const next = createNext();

    (userManagementService.getUserRoleIdentityById as jest.Mock).mockResolvedValueOnce({
      id: 'user-3',
      email: 'old@example.com',
      role: 'staff',
    });
    (userManagementService.findUserByEmailExcludingId as jest.Mock).mockResolvedValueOnce(null);
    (userManagementService.updateUser as jest.Mock).mockResolvedValueOnce(updatedUser);
    mockGetAccountLockoutStatus.mockResolvedValueOnce({
      failedLoginAttempts: 2,
      isLocked: true,
    } as Awaited<ReturnType<typeof getAccountLockoutStatus>>);

    await updateUser(req, res, next);

    expect(mockSyncUserRole).toHaveBeenCalledWith('user-3', 'manager');
    expect(mockSetAccountLockState.mock.calls).toEqual([
      ['old@example.com', false, 'user-3'],
      ['new@example.com', true, 'user-3'],
    ]);
    expect(mockSendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        id: 'user-3',
        email: 'new@example.com',
        role: 'manager',
        isLocked: true,
        failedLoginAttempts: 2,
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects attempts to delete the currently authenticated admin account', async () => {
    const req = createRequest({
      user: { id: 'admin-1' },
      params: { id: 'admin-1' },
    });
    const res = createResponse();
    const next = createNext();

    await deleteUser(req, res, next);

    expect(mockBadRequest).toHaveBeenCalledWith(res, 'Cannot delete your own account');
    expect(userManagementService.deactivateUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('hashes and stores a reset password for an existing user', async () => {
    const req = createRequest({
      params: { id: 'user-4' },
      body: {
        password: 'StrongPass123',
      },
    });
    const res = createResponse();
    const next = createNext();

    (userManagementService.getUserIdentityById as jest.Mock).mockResolvedValueOnce({
      id: 'user-4',
      email: 'user4@example.com',
    });
    mockBcrypt.hash.mockResolvedValueOnce('new-password-hash');

    await resetUserPassword(req, res, next);

    expect(mockBcrypt.hash).toHaveBeenCalledWith('StrongPass123', expect.any(Number));
    expect(userManagementService.updateUserPassword).toHaveBeenCalledWith(
      'user-4',
      'new-password-hash',
      'admin-1'
    );
    expect(mockSendSuccess).toHaveBeenCalledWith(res, {
      message: 'Password reset successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
