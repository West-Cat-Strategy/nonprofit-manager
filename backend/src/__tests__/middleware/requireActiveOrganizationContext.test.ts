import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendError } from '@modules/shared/http/envelope';
import { requireActiveOrganizationSafe } from '@services/authGuardService';
import { setRequestContext } from '@config/requestContext';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendError: jest.fn(),
}));

jest.mock('@services/authGuardService', () => ({
  __esModule: true,
  requireActiveOrganizationSafe: jest.fn(),
}));

jest.mock('@config/requestContext', () => ({
  __esModule: true,
  setRequestContext: jest.fn(),
}));

const mockSendError = sendError as jest.MockedFunction<typeof sendError>;
const mockRequireActiveOrganizationSafe =
  requireActiveOrganizationSafe as jest.MockedFunction<typeof requireActiveOrganizationSafe>;
const mockSetRequestContext = setRequestContext as jest.MockedFunction<typeof setRequestContext>;

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    correlationId: 'corr-1',
    ...overrides,
  } as AuthRequest);

const createResponse = (): Response => ({}) as Response;
const createNext = (): NextFunction => jest.fn();

describe('requireActiveOrganizationContext middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches the active organization context and updates the request context store', async () => {
    const req = createRequest();
    const res = createResponse();
    const next = createNext();

    mockRequireActiveOrganizationSafe.mockResolvedValue({
      ok: true,
      data: {
        organizationId: 'org-123',
        user: {
          id: 'user-1',
        },
      },
    } as Awaited<ReturnType<typeof requireActiveOrganizationSafe>>);

    await requireActiveOrganizationContext(req, res, next);

    expect(req.organizationId).toBe('org-123');
    expect(req.accountId).toBe('org-123');
    expect(req.tenantId).toBe('org-123');
    expect(mockSetRequestContext).toHaveBeenCalledWith({
      organizationId: 'org-123',
      accountId: 'org-123',
      tenantId: 'org-123',
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockSendError).not.toHaveBeenCalled();
  });

  it('returns the canonical error envelope when the organization context check fails', async () => {
    const req = createRequest();
    const res = createResponse();
    const next = createNext();

    mockRequireActiveOrganizationSafe.mockResolvedValue({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Organization is inactive',
        statusCode: 403,
      },
    } as Awaited<ReturnType<typeof requireActiveOrganizationSafe>>);

    await requireActiveOrganizationContext(req, res, next);

    expect(mockSendError).toHaveBeenCalledWith(
      res,
      'forbidden',
      'Organization is inactive',
      403,
      undefined,
      'corr-1'
    );
    expect(req.organizationId).toBeUndefined();
    expect(mockSetRequestContext).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
