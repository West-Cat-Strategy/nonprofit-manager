import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as portalAuthController from '../portalAuthController';
import * as portalAuthService from '@services/portalAuthService';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { logPortalActivity } from '@services/domains/integration';
import { shouldExposeAuthTokensInResponse } from '@utils/authResponse';
import { clearPortalAuthCookie, setPortalAuthCookie } from '@utils/cookieHelper';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@utils/sessionTokens', () => ({
  issuePortalSessionToken: jest.fn(),
}));

jest.mock('@middleware/accountLockout', () => ({
  trackLoginAttempt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@services/domains/integration', () => ({
  logPortalActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@utils/authResponse', () => ({
  shouldExposeAuthTokensInResponse: jest.fn().mockReturnValue(false),
}));

jest.mock('@utils/cookieHelper', () => ({
  clearPortalAuthCookie: jest.fn(),
  setPortalAuthCookie: jest.fn(),
}));

jest.mock('@services/portalAuthService', () => ({
  findPortalUserIdByEmail: jest.fn(),
  findPendingSignupRequestIdByEmail: jest.fn(),
  getOrCreateContactForSignup: jest.fn(),
  createPortalSignupRequest: jest.fn(),
  getPortalLoginUserByEmail: jest.fn(),
  updatePortalUserLastLogin: jest.fn(),
  getPortalUserProfileById: jest.fn(),
  getPortalInvitationByToken: jest.fn(),
  createContactForInvitation: jest.fn(),
  createPortalUserFromInvitation: jest.fn(),
  markPortalInvitationAccepted: jest.fn(),
}));

const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;
const mockTrackLoginAttempt = trackLoginAttempt as jest.Mock;
const mockLogPortalActivity = logPortalActivity as jest.Mock;
const mockShouldExposeAuthTokensInResponse = shouldExposeAuthTokensInResponse as jest.Mock;
const mockSetPortalAuthCookie = setPortalAuthCookie as jest.Mock;
const mockClearPortalAuthCookie = clearPortalAuthCookie as jest.Mock;
const mockPortalAuthService = portalAuthService as jest.Mocked<typeof portalAuthService>;
const { issuePortalSessionToken } = jest.requireMock('@utils/sessionTokens') as {
  issuePortalSessionToken: jest.Mock;
};

type PortalAuthUser = {
  id: string;
  email: string;
  contactId?: string | null;
  contact_id?: string | null;
  status?: string;
  is_verified?: boolean;
  password_hash?: string;
};

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const createBaseRequest = (overrides: Partial<Request> = {}) =>
  ({
    body: {},
    params: {},
    query: {},
    headers: { 'user-agent': 'jest-agent/1.0' },
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides,
  }) as Partial<Request> & {
    portalUser?: PortalAuthUser;
  };

describe('portalAuthController', () => {
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse = createMockResponse() as unknown as Response;
    mockNext = jest.fn();
    mockShouldExposeAuthTokensInResponse.mockReturnValue(false);
    issuePortalSessionToken.mockReturnValue('portal-token');
    mockBcryptHash.mockResolvedValue('hashed-password');
    mockBcryptCompare.mockResolvedValue(true);
  });

  describe('portalSignup', () => {
    it('returns conflict when an account already exists', async () => {
      const req = createBaseRequest({
        body: {
          email: 'Member@Example.com',
          password: 'Secret123!',
          firstName: 'Member',
          lastName: 'One',
        },
      });
      mockPortalAuthService.findPortalUserIdByEmail.mockResolvedValueOnce('portal-user-1');

      await portalAuthController.portalSignup(req as Request, mockResponse, mockNext);

      expect(mockPortalAuthService.findPortalUserIdByEmail).toHaveBeenCalledWith(
        'member@example.com'
      );
      expect(mockPortalAuthService.getOrCreateContactForSignup).not.toHaveBeenCalled();
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(409);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'conflict',
            message: 'Portal account already exists',
          }),
        })
      );
    });

    it('returns conflict when a signup request is already pending', async () => {
      const req = createBaseRequest({
        body: {
          email: 'pending@example.com',
          password: 'Secret123!',
          firstName: 'Pending',
          lastName: 'Person',
        },
      });
      mockPortalAuthService.findPortalUserIdByEmail.mockResolvedValueOnce(null);
      mockPortalAuthService.findPendingSignupRequestIdByEmail.mockResolvedValueOnce('signup-1');

      await portalAuthController.portalSignup(req as Request, mockResponse, mockNext);

      expect(mockPortalAuthService.findPendingSignupRequestIdByEmail).toHaveBeenCalledWith(
        'pending@example.com'
      );
      expect(mockPortalAuthService.getOrCreateContactForSignup).not.toHaveBeenCalled();
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(409);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'conflict',
            message: 'Signup request already pending approval',
          }),
        })
      );
    });

    it('creates a pending signup request with a normalized email and hashed password', async () => {
      const req = createBaseRequest({
        body: {
          email: 'NewUser@Example.com',
          password: 'Secret123!',
          firstName: 'New',
          lastName: 'User',
          phone: '555-0100',
        },
      });
      mockPortalAuthService.findPortalUserIdByEmail.mockResolvedValueOnce(null);
      mockPortalAuthService.findPendingSignupRequestIdByEmail.mockResolvedValueOnce(null);
      mockPortalAuthService.getOrCreateContactForSignup.mockResolvedValueOnce('contact-1');
      mockPortalAuthService.createPortalSignupRequest.mockResolvedValueOnce('signup-1');

      await portalAuthController.portalSignup(req as Request, mockResponse, mockNext);

      expect(mockPortalAuthService.getOrCreateContactForSignup).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: '555-0100',
      });
      expect(mockBcryptHash).toHaveBeenCalledWith('Secret123!', expect.any(Number));
      expect(mockPortalAuthService.createPortalSignupRequest).toHaveBeenCalledWith({
        contactId: 'contact-1',
        email: 'newuser@example.com',
        passwordHash: 'hashed-password',
      });
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(201);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            status: 'pending',
            requestId: 'signup-1',
            message: 'Signup request submitted. A staff member must approve your access.',
          },
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('passes unexpected signup errors to next', async () => {
      const req = createBaseRequest({
        body: {
          email: 'error@example.com',
          password: 'Secret123!',
          firstName: 'Error',
          lastName: 'Case',
        },
      });
      const boom = new Error('boom');
      mockPortalAuthService.findPortalUserIdByEmail.mockRejectedValueOnce(boom);

      await portalAuthController.portalSignup(req as Request, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(boom);
    });
  });

  describe('portalLogin', () => {
    it('rejects missing accounts as invalid credentials and tracks the attempt', async () => {
      const req = createBaseRequest({
        body: { email: 'Missing@Example.com', password: 'Secret123!' },
      });
      mockPortalAuthService.getPortalLoginUserByEmail.mockResolvedValueOnce(null);

      await portalAuthController.portalLogin(req as Request, mockResponse, mockNext);

      expect(mockPortalAuthService.getPortalLoginUserByEmail).toHaveBeenCalledWith(
        'missing@example.com'
      );
      expect(mockTrackLoginAttempt).toHaveBeenCalledWith(
        'missing@example.com',
        false,
        undefined,
        '127.0.0.1'
      );
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(401);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'unauthorized',
            message: 'Invalid credentials',
          }),
        })
      );
    });

    it('rejects suspended accounts before password validation', async () => {
      const req = createBaseRequest({
        body: { email: 'Suspended@Example.com', password: 'Secret123!' },
      });
      mockPortalAuthService.getPortalLoginUserByEmail.mockResolvedValueOnce({
        id: 'portal-user-1',
        email: 'suspended@example.com',
        contact_id: 'contact-1',
        status: 'suspended',
        is_verified: true,
        password_hash: 'hashed-password',
      });

      await portalAuthController.portalLogin(req as Request, mockResponse, mockNext);

      expect(mockBcryptCompare).not.toHaveBeenCalled();
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(403);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'forbidden',
            message: 'Account is suspended',
          }),
        })
      );
    });

    it('rejects pending accounts before password validation', async () => {
      const req = createBaseRequest({
        body: { email: 'Pending@Example.com', password: 'Secret123!' },
      });
      mockPortalAuthService.getPortalLoginUserByEmail.mockResolvedValueOnce({
        id: 'portal-user-2',
        email: 'pending@example.com',
        contact_id: 'contact-2',
        status: 'active',
        is_verified: false,
        password_hash: 'hashed-password',
      });

      await portalAuthController.portalLogin(req as Request, mockResponse, mockNext);

      expect(mockBcryptCompare).not.toHaveBeenCalled();
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(403);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'forbidden',
            message: 'Account pending verification',
          }),
        })
      );
    });

    it('rejects invalid passwords and tracks the failed attempt', async () => {
      const req = createBaseRequest({
        body: { email: 'Member@Example.com', password: 'WrongPassword!' },
      });
      mockPortalAuthService.getPortalLoginUserByEmail.mockResolvedValueOnce({
        id: 'portal-user-1',
        email: 'member@example.com',
        contact_id: 'contact-1',
        status: 'active',
        is_verified: true,
        password_hash: 'hashed-password',
      });
      mockBcryptCompare.mockResolvedValueOnce(false);

      await portalAuthController.portalLogin(req as Request, mockResponse, mockNext);

      expect(mockBcryptCompare).toHaveBeenCalledWith('WrongPassword!', 'hashed-password');
      expect(mockTrackLoginAttempt).toHaveBeenCalledWith(
        'member@example.com',
        false,
        undefined,
        '127.0.0.1'
      );
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(401);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'unauthorized',
            message: 'Invalid credentials',
          }),
        })
      );
    });

    it('sets the portal auth cookie and returns the mapped session user on success', async () => {
      const req = createBaseRequest({
        body: { email: 'Member@Example.com', password: 'Secret123!' },
      });
      mockPortalAuthService.getPortalLoginUserByEmail.mockResolvedValueOnce({
        id: 'portal-user-1',
        email: 'member@example.com',
        contact_id: 'contact-1',
        status: 'active',
        is_verified: true,
        password_hash: 'hashed-password',
      });

      await portalAuthController.portalLogin(req as Request, mockResponse, mockNext);

      expect(issuePortalSessionToken).toHaveBeenCalledWith({
        id: 'portal-user-1',
        email: 'member@example.com',
        contactId: 'contact-1',
      });
      expect(mockSetPortalAuthCookie).toHaveBeenCalledWith(mockResponse, 'portal-token');
      expect(mockPortalAuthService.updatePortalUserLastLogin).toHaveBeenCalledWith('portal-user-1');
      expect(mockTrackLoginAttempt).toHaveBeenCalledWith(
        'member@example.com',
        true,
        undefined,
        '127.0.0.1'
      );
      expect(mockLogPortalActivity).toHaveBeenCalledWith({
        portalUserId: 'portal-user-1',
        action: 'login.success',
        details: 'Portal user logged in',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent/1.0',
      });
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            user: {
              id: 'portal-user-1',
              email: 'member@example.com',
              contactId: 'contact-1',
            },
          },
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('bootstrap and me endpoints', () => {
    it('returns not found from bootstrap when the portal profile is missing', async () => {
      const req = createBaseRequest({
        portalUser: { id: 'portal-user-404', email: 'missing@example.com', contactId: null },
      });
      mockPortalAuthService.getPortalUserProfileById.mockResolvedValueOnce(null);

      await portalAuthController.getPortalBootstrap(req as Request, mockResponse, mockNext);

      expect(mockPortalAuthService.getPortalUserProfileById).toHaveBeenCalledWith(
        'portal-user-404'
      );
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'not_found',
            message: 'Portal user not found',
          }),
        })
      );
    });

    it('returns the mapped bootstrap user payload', async () => {
      const req = createBaseRequest({
        portalUser: { id: 'portal-user-1', email: 'member@example.com', contactId: 'contact-1' },
      });
      mockPortalAuthService.getPortalUserProfileById.mockResolvedValueOnce({
        id: 'portal-user-1',
        email: 'member@example.com',
        contact_id: 'contact-1',
        status: 'active',
        is_verified: true,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        last_login_at: null,
        first_name: 'Member',
        last_name: 'One',
        phone: null,
        mobile_phone: null,
      });

      await portalAuthController.getPortalBootstrap(req as Request, mockResponse, mockNext);

      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            user: {
              id: 'portal-user-1',
              email: 'member@example.com',
              contactId: 'contact-1',
            },
          },
        })
      );
    });

    it('returns the full profile from me', async () => {
      const req = createBaseRequest({
        portalUser: { id: 'portal-user-1', email: 'member@example.com', contactId: 'contact-1' },
      });
      mockPortalAuthService.getPortalUserProfileById.mockResolvedValueOnce({
        id: 'portal-user-1',
        email: 'member@example.com',
        contact_id: 'contact-1',
        status: 'active',
        is_verified: true,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        last_login_at: new Date('2026-03-01T00:00:00.000Z'),
        first_name: 'Member',
        last_name: 'One',
        phone: '555-0100',
        mobile_phone: null,
      });

      await portalAuthController.getPortalMe(req as Request, mockResponse, mockNext);

      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'portal-user-1',
            email: 'member@example.com',
            contact_id: 'contact-1',
          }),
        })
      );
    });
  });

  describe('invitation validation and acceptance', () => {
    it('returns not found when an invitation token does not exist', async () => {
      const req = createBaseRequest({ params: { token: 'missing-token' } });
      mockPortalAuthService.getPortalInvitationByToken.mockResolvedValueOnce(null);

      await portalAuthController.validatePortalInvitation(req as Request, mockResponse, mockNext);

      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'not_found',
            message: 'Invitation not found',
          }),
        })
      );
    });

    it('rejects already accepted invitations during validation', async () => {
      const req = createBaseRequest({ params: { token: 'accepted-token' } });
      mockPortalAuthService.getPortalInvitationByToken.mockResolvedValueOnce({
        id: 'invitation-1',
        email: 'member@example.com',
        contact_id: 'contact-1',
        created_by: 'staff-1',
        expires_at: new Date('2026-04-01T00:00:00.000Z'),
        accepted_at: new Date('2026-04-02T00:00:00.000Z'),
      });

      await portalAuthController.validatePortalInvitation(req as Request, mockResponse, mockNext);

      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'bad_request',
            message: 'Invitation already accepted',
          }),
        })
      );
    });

    it('returns the invitation payload when validation succeeds', async () => {
      const req = createBaseRequest({ params: { token: 'valid-token' } });
      mockPortalAuthService.getPortalInvitationByToken.mockResolvedValueOnce({
        id: 'invitation-1',
        email: 'member@example.com',
        contact_id: 'contact-1',
        created_by: 'staff-1',
        expires_at: new Date('2026-06-01T00:00:00.000Z'),
        accepted_at: null,
      });

      await portalAuthController.validatePortalInvitation(req as Request, mockResponse, mockNext);

      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            valid: true,
            invitation: expect.objectContaining({
              email: 'member@example.com',
              contactId: 'contact-1',
              expiresAt: new Date('2026-06-01T00:00:00.000Z'),
            }),
          }),
        })
      );
    });

    it('creates a portal user from an invitation and sets the auth cookie', async () => {
      const req = createBaseRequest({
        params: { token: 'accept-token' },
        body: {
          firstName: 'New',
          lastName: 'Member',
          password: 'Secret123!',
        },
      });
      mockShouldExposeAuthTokensInResponse.mockReturnValueOnce(true);
      mockPortalAuthService.getPortalInvitationByToken.mockResolvedValueOnce({
        id: 'invitation-1',
        email: 'Invitee@Example.com',
        contact_id: null,
        created_by: 'staff-1',
        expires_at: new Date('2026-06-01T00:00:00.000Z'),
        accepted_at: null,
      });
      mockPortalAuthService.findPortalUserIdByEmail.mockResolvedValueOnce(null);
      mockPortalAuthService.createContactForInvitation.mockResolvedValueOnce('contact-2');
      mockPortalAuthService.createPortalUserFromInvitation.mockResolvedValueOnce({
        id: 'portal-user-2',
        email: 'invitee@example.com',
        contact_id: 'contact-2',
      });

      await portalAuthController.acceptPortalInvitation(req as Request, mockResponse, mockNext);

      expect(mockPortalAuthService.findPortalUserIdByEmail).toHaveBeenCalledWith(
        'invitee@example.com'
      );
      expect(mockPortalAuthService.createContactForInvitation).toHaveBeenCalledWith({
        firstName: 'New',
        lastName: 'Member',
        email: 'invitee@example.com',
      });
      expect(mockBcryptHash).toHaveBeenCalledWith('Secret123!', expect.any(Number));
      expect(mockPortalAuthService.createPortalUserFromInvitation).toHaveBeenCalledWith({
        contactId: 'contact-2',
        email: 'invitee@example.com',
        passwordHash: 'hashed-password',
        verifiedBy: 'staff-1',
      });
      expect(mockPortalAuthService.markPortalInvitationAccepted).toHaveBeenCalledWith('invitation-1');
      expect(mockSetPortalAuthCookie).toHaveBeenCalledWith(mockResponse, 'portal-token');
      expect(issuePortalSessionToken).toHaveBeenCalledWith({
        id: 'portal-user-2',
        email: 'invitee@example.com',
        contactId: 'contact-2',
      });
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(201);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            token: 'portal-token',
            user: {
              id: 'portal-user-2',
              email: 'invitee@example.com',
              contactId: 'contact-2',
            },
          },
        })
      );
    });

    it('returns conflict when the invitation email already has a portal account', async () => {
      const req = createBaseRequest({
        params: { token: 'accept-token' },
        body: {
          firstName: 'New',
          lastName: 'Member',
          password: 'Secret123!',
        },
      });
      mockPortalAuthService.getPortalInvitationByToken.mockResolvedValueOnce({
        id: 'invitation-1',
        email: 'Invitee@Example.com',
        contact_id: 'contact-1',
        created_by: 'staff-1',
        expires_at: new Date('2026-06-01T00:00:00.000Z'),
        accepted_at: null,
      });
      mockPortalAuthService.findPortalUserIdByEmail.mockResolvedValueOnce('portal-user-1');

      await portalAuthController.acceptPortalInvitation(req as Request, mockResponse, mockNext);

      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(409);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'conflict',
            message: 'Portal account already exists',
          }),
        })
      );
    });

    it('returns bad request when an invitation cannot resolve a contact', async () => {
      const req = createBaseRequest({
        params: { token: 'accept-token' },
        body: {
          firstName: 'New',
          lastName: 'Member',
          password: 'Secret123!',
        },
      });
      mockPortalAuthService.getPortalInvitationByToken.mockResolvedValueOnce({
        id: 'invitation-1',
        email: 'Invitee@Example.com',
        contact_id: null,
        created_by: 'staff-1',
        expires_at: new Date('2026-06-01T00:00:00.000Z'),
        accepted_at: null,
      });
      mockPortalAuthService.findPortalUserIdByEmail.mockResolvedValueOnce(null);
      mockPortalAuthService.createContactForInvitation.mockResolvedValueOnce(null);

      await portalAuthController.acceptPortalInvitation(req as Request, mockResponse, mockNext);

      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'bad_request',
            message: 'Unable to resolve contact for invitation',
          }),
        })
      );
    });
  });

  describe('portalLogout', () => {
    it('clears the portal auth cookie and responds successfully', async () => {
      const req = createBaseRequest();

      await portalAuthController.portalLogout(req as Request, mockResponse, mockNext);

      expect(mockClearPortalAuthCookie).toHaveBeenCalledWith(mockResponse);
      expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            message: 'Portal logout successful',
          },
        })
      );
    });
  });
});
