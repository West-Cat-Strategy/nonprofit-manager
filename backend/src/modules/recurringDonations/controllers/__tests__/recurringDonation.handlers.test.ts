import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { requirePermissionSafe } from '@services/authGuardService';
import { badRequest, serverError } from '@utils/responseHelpers';
import { recurringDonationController } from '../recurringDonation.handlers';
import { recurringDonationService } from '../../services/recurringDonationService';

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('@utils/responseHelpers', () => ({
  badRequest: jest.fn(),
  notFoundMessage: jest.fn(),
  serverError: jest.fn(),
  unauthorized: jest.fn(),
}));

jest.mock('../../services/recurringDonationService', () => ({
  recurringDonationService: {
    updatePlan: jest.fn(),
    cancelPlan: jest.fn(),
    reactivatePlan: jest.fn(),
  },
}));

const mockRequirePermissionSafe = requirePermissionSafe as jest.Mock;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockServerError = serverError as jest.MockedFunction<typeof serverError>;
const mockRecurringDonationService = recurringDonationService as jest.Mocked<
  Pick<typeof recurringDonationService, 'updatePlan' | 'cancelPlan' | 'reactivatePlan'>
>;

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    organizationId: 'org-1',
    params: { id: 'plan-1' },
    body: {},
    user: { id: 'user-1' },
    ...overrides,
  }) as AuthRequest;

describe('recurringDonationController provider-management errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequirePermissionSafe.mockReturnValue({ ok: true, value: null });
  });

  it('returns a 400 for provider-gated amount changes instead of a server error', async () => {
    const error = new Error(
      'PayPal recurring donation amount changes are not supported in this release; use the provider management portal.'
    );
    mockRecurringDonationService.updatePlan.mockRejectedValue(error);

    const req = createRequest({ body: { amount: 30 } });
    const res = createResponse();

    await recurringDonationController.updatePlan(req, res);

    expect(mockRequirePermissionSafe).toHaveBeenCalledWith(req, Permission.DONATION_EDIT);
    expect(mockBadRequest).toHaveBeenCalledWith(res, error.message);
    expect(mockServerError).not.toHaveBeenCalled();
  });

  it('returns a 400 for provider-gated cancellation instead of a server error', async () => {
    const error = new Error(
      'Square recurring donation cancellation is not supported in this release; use the provider management portal.'
    );
    mockRecurringDonationService.cancelPlan.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();

    await recurringDonationController.cancelPlan(req, res);

    expect(mockRequirePermissionSafe).toHaveBeenCalledWith(req, Permission.DONATION_EDIT);
    expect(mockBadRequest).toHaveBeenCalledWith(res, error.message);
    expect(mockServerError).not.toHaveBeenCalled();
  });

  it('returns a 400 for disconnected provider subscriptions instead of a server error', async () => {
    const error = new Error('Recurring donation plan is not yet connected to a PayPal subscription');
    mockRecurringDonationService.reactivatePlan.mockRejectedValue(error);

    const req = createRequest();
    const res = createResponse();

    await recurringDonationController.reactivatePlan(req, res);

    expect(mockRequirePermissionSafe).toHaveBeenCalledWith(req, Permission.DONATION_EDIT);
    expect(mockBadRequest).toHaveBeenCalledWith(res, error.message);
    expect(mockServerError).not.toHaveBeenCalled();
  });
});
