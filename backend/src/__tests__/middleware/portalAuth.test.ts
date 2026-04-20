import { Response } from 'express';
import { getRequestContext, runWithRequestContext } from '@config/requestContext';
import { authenticatePortal, type PortalAuthRequest } from '@middleware/portalAuth';

jest.mock('@services/portalAuthService', () => ({
  getPortalUserProfileById: jest.fn(),
}));

jest.mock('@utils/sessionTokens', () => ({
  PORTAL_SESSION_TOKEN_ISSUER: 'nonprofit-manager-portal',
  verifyTokenWithOptionalIssuer: jest.fn(),
}));

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const portalAuthService = jest.requireMock('@services/portalAuthService') as {
  getPortalUserProfileById: jest.Mock;
};
const { verifyTokenWithOptionalIssuer } = jest.requireMock('@utils/sessionTokens') as {
  verifyTokenWithOptionalIssuer: jest.Mock;
};

describe('portalAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores portal-scoped request context from the verified portal profile', async () => {
    const req = {
      cookies: { portal_auth_token: 'good-token' },
      headers: {},
    } as PortalAuthRequest;
    const res = createMockResponse() as unknown as Response;
    const next = jest.fn();

    verifyTokenWithOptionalIssuer.mockReturnValue({
      id: 'portal-user-1',
      email: 'stale@example.com',
      contactId: 'contact-stale',
      type: 'portal',
    });
    portalAuthService.getPortalUserProfileById.mockResolvedValue({
      id: 'portal-user-1',
      email: 'verified@example.com',
      contact_id: 'contact-live',
      status: 'active',
      is_verified: true,
    });

    const context = await runWithRequestContext(
      { correlationId: 'corr-1', userId: 'staff-user-1' },
      async () => {
        await authenticatePortal(req, res, next);
        return getRequestContext();
      }
    );

    expect(req.portalUser).toEqual({
      id: 'portal-user-1',
      email: 'verified@example.com',
      contactId: 'contact-live',
      type: 'portal',
    });
    expect(context).toMatchObject({
      correlationId: 'corr-1',
      userId: 'staff-user-1',
      portalUserId: 'portal-user-1',
      portalContactId: 'contact-live',
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects inactive portal users without populating portal request context', async () => {
    const req = {
      cookies: { portal_auth_token: 'bad-token' },
      headers: {},
    } as PortalAuthRequest;
    const res = createMockResponse() as unknown as Response;
    const next = jest.fn();

    verifyTokenWithOptionalIssuer.mockReturnValue({
      id: 'portal-user-2',
      email: 'portal@example.com',
      contactId: 'contact-2',
      type: 'portal',
    });
    portalAuthService.getPortalUserProfileById.mockResolvedValue({
      id: 'portal-user-2',
      email: 'portal@example.com',
      contact_id: 'contact-2',
      status: 'suspended',
      is_verified: true,
    });

    const context = await runWithRequestContext({ correlationId: 'corr-2' }, async () => {
      await authenticatePortal(req, res, next);
      return getRequestContext();
    });

    expect(req.portalUser).toBeUndefined();
    expect(context).toMatchObject({ correlationId: 'corr-2' });
    expect(context?.portalUserId).toBeUndefined();
    expect(context?.portalContactId).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
