import type { NextFunction, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import type { AuthRequest } from '@middleware/auth';
import {
  approvePortalSignupRequest,
  createPortalInvitation,
  listPortalUsers,
  resetPortalUserPassword,
  updatePortalUserStatus,
} from '../portalAdminController';
import { guardWithPermission } from '@services/authGuardService';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@services/domains/integration', () => ({
  __esModule: true,
  getPortalActivity: jest.fn(),
}));

jest.mock('@services/emailService', () => ({
  __esModule: true,
  sendMail: jest.fn(),
}));

jest.mock('@modules/portal/services/portalMessagingService', () => ({
  __esModule: true,
  addStaffMessage: jest.fn(),
  getStaffThread: jest.fn(),
  listStaffThreads: jest.fn(),
  markStaffThreadRead: jest.fn(),
  updateThread: jest.fn(),
}));

jest.mock('../../services/portalAppointmentSlotService', () => ({
  __esModule: true,
  checkInAppointmentByStaff: jest.fn(),
  createAppointmentSlot: jest.fn(),
  deleteAppointmentSlot: jest.fn(),
  getAppointmentById: jest.fn(),
  listAdminAppointments: jest.fn(),
  listAdminAppointmentSlots: jest.fn(),
  updateAppointmentSlot: jest.fn(),
  updateAppointmentStatusByStaff: jest.fn(),
}));

jest.mock('../../services/appointmentReminderService', () => ({
  __esModule: true,
  listAppointmentReminders: jest.fn(),
  sendAppointmentReminders: jest.fn(),
}));

jest.mock('@services/portalRealtimeService', () => ({
  __esModule: true,
  isPortalRealtimeEnabled: jest.fn(),
  openPortalRealtimeStream: jest.fn(),
}));

jest.mock('@services/authGuardService', () => ({
  __esModule: true,
  guardWithPermission: jest.fn(),
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
const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;
const mockGuardWithPermission = guardWithPermission as jest.MockedFunction<
  typeof guardWithPermission
>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockConflict = conflict as jest.MockedFunction<typeof conflict>;
const mockNotFoundMessage = notFoundMessage as jest.MockedFunction<typeof notFoundMessage>;
const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    user: { id: 'admin-1' },
    body: {},
    params: {},
    query: {},
    validatedQuery: {},
    ...overrides,
  } as AuthRequest);

const createResponse = (): Response => ({}) as Response;
const createNext = (): NextFunction => jest.fn();

describe('portalAdminController account-management flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuardWithPermission.mockReturnValue(true);
  });

  it('blocks approval when the portal account already exists for the signup email', async () => {
    const req = createRequest({
      params: { id: 'signup-1' },
    });
    const res = createResponse();
    const next = createNext();

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'signup-1',
            email: 'portal@example.com',
            password_hash: 'hash',
            contact_id: 'contact-1',
            status: 'pending',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'portal-user-1' }],
      });

    await approvePortalSignupRequest(req, res, next);

    expect(mockConflict).toHaveBeenCalledWith(res, 'Portal account already exists');
    expect(mockSendSuccess).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks invitation creation when an active invitation is already pending', async () => {
    const req = createRequest({
      body: {
        email: 'portal@example.com',
      },
    });
    const res = createResponse();
    const next = createNext();

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'invite-1' }] });

    await createPortalInvitation(req, res, next);

    expect(mockConflict).toHaveBeenCalledWith(res, 'Pending portal invitation already exists');
    expect(mockSendSuccess).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('lists portal users with the validated search filter and canonical envelope', async () => {
    const rows = [
      {
        id: 'portal-user-2',
        email: 'alice@example.com',
        status: 'active',
      },
    ];
    const req = createRequest({
      validatedQuery: {
        search: ' Alice ',
      },
    });
    const res = createResponse();
    const next = createNext();

    mockQuery.mockResolvedValueOnce({ rows });

    await listPortalUsers(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE ('),
      ['%Alice%']
    );
    expect(mockSendSuccess).toHaveBeenCalledWith(res, { users: rows });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns not found when a portal user status update affects no rows', async () => {
    const req = createRequest({
      params: { id: 'portal-user-3' },
      body: { status: 'suspended' },
    });
    const res = createResponse();
    const next = createNext();

    mockQuery.mockResolvedValueOnce({ rows: [] });

    await updatePortalUserStatus(req, res, next);

    expect(mockNotFoundMessage).toHaveBeenCalledWith(res, 'Portal user not found');
    expect(mockSendSuccess).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects direct status updates outside the supported active and suspended values', async () => {
    const req = createRequest({
      params: { id: 'portal-user-4' },
      body: { status: 'disabled' },
    });
    const res = createResponse();
    const next = createNext();

    await updatePortalUserStatus(req, res, next);

    expect(mockBadRequest).toHaveBeenCalledWith(res, 'Status must be active or suspended');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('hashes and stores a portal password reset for the requested user', async () => {
    const req = createRequest({
      body: {
        portalUserId: 'portal-user-5',
        password: 'StrongPass123',
      },
    });
    const res = createResponse();
    const next = createNext();

    mockBcrypt.hash.mockResolvedValueOnce('portal-password-hash');
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await resetPortalUserPassword(req, res, next);

    expect(mockBcrypt.hash).toHaveBeenCalledWith('StrongPass123', expect.any(Number));
    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE portal_users SET password_hash = $1 WHERE id = $2',
      ['portal-password-hash', 'portal-user-5']
    );
    expect(mockSendSuccess).toHaveBeenCalledWith(res, {
      message: 'Portal user password updated',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
