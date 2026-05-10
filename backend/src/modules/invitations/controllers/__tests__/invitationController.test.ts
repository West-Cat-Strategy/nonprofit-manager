import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { acceptInvitation } from '../invitationController';
import { invitationService, syncUserRole } from '../../services/invitationService';
import { seedDefaultOrganizationAccess } from '@services/accountAccessService';
import { setAuthCookie } from '@utils/cookieHelper';
import { buildAuthTokenResponse, generateAuthSessionCsrfToken } from '@utils/authResponse';
import { issueAppSessionToken } from '@utils/sessionTokens';
import { setCurrentUserId, withDatabaseTransaction } from '@config/database';
import { mapAuthUser } from '@modules/auth/lib/authResponseMappers';

const mockTransactionClient = {
  query: jest.fn(),
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
  setCurrentUserId: jest.fn().mockResolvedValue(undefined),
  withDatabaseTransaction: jest.fn(async (fn: (client: typeof mockTransactionClient) => unknown) =>
    fn(mockTransactionClient)
  ),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('../../services/invitationService', () => ({
  invitationService: {
    validateInvitation: jest.fn(),
    validateInvitationForAcceptance: jest.fn(),
    markInvitationAccepted: jest.fn(),
  },
  syncUserRole: jest.fn(),
}));

jest.mock('../../services/invitationEmailService', () => ({
  getEmailSettings: jest.fn(),
  sendInvitationEmail: jest.fn(),
}));

jest.mock('@services/accountAccessService', () => ({
  seedDefaultOrganizationAccess: jest.fn(),
}));

jest.mock('@utils/cookieHelper', () => ({
  setAuthCookie: jest.fn(),
}));

jest.mock('@utils/authResponse', () => ({
  buildAuthTokenResponse: jest.fn(),
  generateAuthSessionCsrfToken: jest.fn(),
}));

jest.mock('@utils/sessionTokens', () => ({
  issueAppSessionToken: jest.fn(),
}));

jest.mock('@modules/auth/lib/authResponseMappers', () => ({
  mapAuthUser: jest.fn(),
}));

const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockInvitationService = invitationService as jest.Mocked<typeof invitationService>;
const mockSyncUserRole = syncUserRole as jest.Mock;
const mockSeedDefaultOrganizationAccess = seedDefaultOrganizationAccess as jest.Mock;
const mockSetAuthCookie = setAuthCookie as jest.Mock;
const mockBuildAuthTokenResponse = buildAuthTokenResponse as jest.Mock;
const mockGenerateAuthSessionCsrfToken = generateAuthSessionCsrfToken as jest.Mock;
const mockIssueAppSessionToken = issueAppSessionToken as jest.Mock;
const mockSetCurrentUserId = setCurrentUserId as jest.Mock;
const mockWithDatabaseTransaction = withDatabaseTransaction as jest.Mock;
const mockMapAuthUser = mapAuthUser as jest.Mock;

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

const createAcceptRequest = (token = 'invite-token') =>
  ({
    params: { token },
    body: {
      firstName: 'Invited',
      lastName: 'User',
      password: 'StrongP@ssw0rd',
    },
    headers: {},
  }) as Request<{ token: string }>;

const invitation = {
  id: 'invite-1',
  email: 'invitee@example.com',
  role: 'staff',
  token: 'invite-token',
  expiresAt: new Date(Date.now() + 60_000),
  acceptedAt: null,
  acceptedBy: null,
  isRevoked: false,
  revokedAt: null,
  revokedBy: null,
  message: null,
  createdAt: new Date(),
  createdBy: 'admin-1',
  createdByName: 'Admin User',
};

const insertedUser = {
  id: 'user-1',
  email: 'invitee@example.com',
  first_name: 'Invited',
  last_name: 'User',
  role: 'staff',
  profile_picture: null,
  is_active: true,
  created_at: new Date(),
  auth_revision: 0,
};

describe('invitationController.acceptInvitation', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionClient.query.mockReset();
    mockBcryptHash.mockResolvedValue('hashed-password');
    mockInvitationService.validateInvitation.mockResolvedValue({
      valid: true,
      invitation,
    });
    mockInvitationService.validateInvitationForAcceptance.mockResolvedValue({
      valid: true,
      invitation,
    });
    mockInvitationService.markInvitationAccepted.mockResolvedValue({
      ...invitation,
      acceptedAt: new Date(),
      acceptedBy: 'user-1',
    });
    mockSyncUserRole.mockResolvedValue(undefined);
    mockSeedDefaultOrganizationAccess.mockResolvedValue('org-1');
    mockIssueAppSessionToken.mockReturnValue('app-session-token');
    mockBuildAuthTokenResponse.mockReturnValue({});
    mockGenerateAuthSessionCsrfToken.mockReturnValue('csrf-token');
    mockMapAuthUser.mockReturnValue({
      id: 'user-1',
      email: 'invitee@example.com',
      firstName: 'Invited',
      lastName: 'User',
      role: 'staff',
      profilePicture: null,
    });
    mockTransactionClient.query.mockResolvedValue({ rows: [insertedUser] });
    mockWithDatabaseTransaction.mockImplementation(
      async (fn: (client: typeof mockTransactionClient) => unknown) => fn(mockTransactionClient)
    );
    res = createMockResponse();
    next = jest.fn();
  });

  it('creates the invited user, consumes the invitation, and sets a cookie-backed session', async () => {
    await acceptInvitation(createAcceptRequest(), res, next);

    expect(mockInvitationService.validateInvitation).toHaveBeenCalledWith('invite-token');
    expect(mockInvitationService.validateInvitationForAcceptance).toHaveBeenCalledWith(
      'invite-token',
      mockTransactionClient,
      { lock: true }
    );
    expect(mockTransactionClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['invitee@example.com', 'hashed-password', 'Invited', 'User', 'staff', 'admin-1']
    );
    expect(mockSetCurrentUserId).toHaveBeenCalledWith(mockTransactionClient, 'user-1', {
      local: true,
    });
    expect(mockSyncUserRole).toHaveBeenCalledWith('user-1', 'staff', mockTransactionClient);
    expect(mockSeedDefaultOrganizationAccess).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        role: 'staff',
        grantedBy: 'admin-1',
      },
      mockTransactionClient
    );
    expect(mockInvitationService.markInvitationAccepted).toHaveBeenCalledWith(
      'invite-1',
      'user-1',
      mockTransactionClient
    );
    expect(mockIssueAppSessionToken).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'invitee@example.com',
      role: 'staff',
      organizationId: 'org-1',
      authRevision: 0,
    });
    expect(mockSetAuthCookie).toHaveBeenCalledWith(res, 'app-session-token');
    expect(mockGenerateAuthSessionCsrfToken).toHaveBeenCalledWith(
      expect.objectContaining({ params: { token: 'invite-token' } }),
      res,
      'app-session-token'
    );
    expect(mockMapAuthUser).toHaveBeenCalledWith(insertedUser);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data).toMatchObject({
      message: 'Account created successfully',
      csrfToken: 'csrf-token',
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'invitee@example.com',
      },
    });
    expect(payload.data.token).toBeUndefined();
    expect(payload.token).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['This invitation has been revoked'],
    ['This invitation has already been used'],
    ['This invitation has expired'],
  ])('rejects invalid invitation state before creating a user: %s', async (message) => {
    mockInvitationService.validateInvitation.mockResolvedValueOnce({
      valid: false,
      invitation,
      error: message,
    });

    await acceptInvitation(createAcceptRequest(), res, next);

    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockWithDatabaseTransaction).not.toHaveBeenCalled();
    expect(mockSetAuthCookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error.message).toBe(message);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the locked transaction recheck finds the invitation was consumed', async () => {
    mockInvitationService.validateInvitationForAcceptance.mockResolvedValueOnce({
      valid: false,
      invitation,
      error: 'This invitation has already been used',
    });

    await acceptInvitation(createAcceptRequest(), res, next);

    expect(mockBcryptHash).toHaveBeenCalled();
    expect(mockTransactionClient.query).not.toHaveBeenCalled();
    expect(mockSetAuthCookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error.message).toBe('This invitation has already been used');
    expect(next).not.toHaveBeenCalled();
  });
});
