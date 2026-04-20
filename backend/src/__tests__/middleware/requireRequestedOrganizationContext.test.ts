import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendError } from '@modules/shared/http/envelope';
import { requireRequestedOrganizationContext } from '@middleware/requireRequestedOrganizationContext';

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendError: jest.fn(),
}));

const mockSendError = sendError as jest.MockedFunction<typeof sendError>;

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    correlationId: 'corr-1',
    ...overrides,
  } as AuthRequest);

const createResponse = (): Response => ({}) as Response;
const createNext = (): NextFunction => jest.fn();

describe('requireRequestedOrganizationContext middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through when an explicit requested organization target is present', () => {
    const req = createRequest({
      requestedOrganizationId: 'org-123',
      requestedOrganizationSource: 'header',
    });
    const res = createResponse();
    const next = createNext();

    requireRequestedOrganizationContext(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockSendError).not.toHaveBeenCalled();
  });

  it('returns the canonical bad-request envelope when the request omits an explicit org target', () => {
    const req = createRequest();
    const res = createResponse();
    const next = createNext();

    requireRequestedOrganizationContext(req, res, next);

    expect(mockSendError).toHaveBeenCalledWith(
      res,
      'bad_request',
      'No organization context',
      400,
      undefined,
      'corr-1'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects ambient organization context when no explicit org target was requested', () => {
    const req = createRequest({
      organizationId: 'org-123',
      accountId: 'org-123',
      tenantId: 'org-123',
    });
    const res = createResponse();
    const next = createNext();

    requireRequestedOrganizationContext(req, res, next);

    expect(mockSendError).toHaveBeenCalledWith(
      res,
      'bad_request',
      'No organization context',
      400,
      undefined,
      'corr-1'
    );
    expect(next).not.toHaveBeenCalled();
  });
});
