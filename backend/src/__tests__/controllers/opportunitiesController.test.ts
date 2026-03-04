import type { Response } from 'express';
import opportunitiesController from '@modules/opportunities/controllers/opportunities.controller';
import { opportunityService } from '@modules/opportunities/services/opportunity.service';
import { sendSuccess } from '@modules/shared/http/envelope';
import { badRequest, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';
import { requirePermissionSafe, sendForbidden, sendUnauthorized } from '@services/authGuardService';

jest.mock('@modules/opportunities/services/opportunity.service', () => ({
  opportunityService: {
    ensureDefaultStages: jest.fn(),
    listStages: jest.fn(),
    createStage: jest.fn(),
    reorderStages: jest.fn(),
    listOpportunities: jest.fn(),
    getOpportunityById: jest.fn(),
    deleteOpportunity: jest.fn(),
  },
}));

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('@modules/shared/http/envelope', () => ({
  sendSuccess: jest.fn(),
}));

jest.mock('@utils/responseHelpers', () => ({
  badRequest: jest.fn(),
  notFoundMessage: jest.fn(),
  serverError: jest.fn(),
  unauthorized: jest.fn(),
}));

const mockService = opportunityService as jest.Mocked<typeof opportunityService>;
const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;
const mockRequirePermissionSafe = requirePermissionSafe as jest.MockedFunction<typeof requirePermissionSafe>;
const mockSendForbidden = sendForbidden as jest.MockedFunction<typeof sendForbidden>;
const mockSendUnauthorized = sendUnauthorized as jest.MockedFunction<typeof sendUnauthorized>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockNotFoundMessage = notFoundMessage as jest.MockedFunction<typeof notFoundMessage>;
const mockUnauthorized = unauthorized as jest.MockedFunction<typeof unauthorized>;
const mockServerError = serverError as jest.MockedFunction<typeof serverError>;

const createResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('opportunitiesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequirePermissionSafe.mockReturnValue({ ok: true } as never);
  });

  it('listStages sends auth error when permission guard fails with unauthorized', async () => {
    mockRequirePermissionSafe.mockReturnValue({
      ok: false,
      error: { code: 'unauthorized', message: 'No session' },
    } as never);

    const req = { user: { id: 'user-1' } } as any;
    const res = createResponse();

    await opportunitiesController.listStages(req, res);

    expect(mockSendUnauthorized).toHaveBeenCalledWith(res, 'No session');
  });

  it('listStages sends forbidden when permission guard fails with forbidden', async () => {
    mockRequirePermissionSafe.mockReturnValue({
      ok: false,
      error: { code: 'forbidden', message: 'No permission' },
    } as never);

    const req = { user: { id: 'user-1' } } as any;
    const res = createResponse();

    await opportunitiesController.listStages(req, res);

    expect(mockSendForbidden).toHaveBeenCalledWith(res, 'No permission');
  });

  it('listStages requires organization context', async () => {
    const req = { user: { id: 'user-1' } } as any;
    const res = createResponse();

    await opportunitiesController.listStages(req, res);

    expect(mockUnauthorized).toHaveBeenCalledWith(res, 'Organization context required');
  });

  it('listStages returns data when permission and context are valid', async () => {
    mockService.listStages.mockResolvedValueOnce([
      {
        id: 'stage-1',
        organization_id: 'org-1',
        name: 'Prospecting',
        stage_order: 0,
        probability: 10,
        is_closed: false,
        is_won: false,
        is_active: true,
        created_by: 'user-1',
        created_at: '2026-03-03T00:00:00.000Z',
        updated_at: '2026-03-03T00:00:00.000Z',
      },
    ] as never);

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
    } as any;
    const res = createResponse();

    await opportunitiesController.listStages(req, res);

    expect(mockService.ensureDefaultStages).toHaveBeenCalledWith('org-1', 'user-1');
    expect(mockSendSuccess).toHaveBeenCalled();
  });

  it('createStage maps client validation/service errors to badRequest', async () => {
    mockService.createStage.mockRejectedValueOnce(new Error('invalid stage payload'));

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
      body: { name: '' },
    } as any;
    const res = createResponse();

    await opportunitiesController.createStage(req, res);

    expect(mockBadRequest).toHaveBeenCalledWith(res, 'invalid stage payload');
  });

  it('listOpportunities uses validatedQuery when present', async () => {
    mockService.listOpportunities.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    } as never);

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
      validatedQuery: { status: 'open', page: 1, limit: 20 },
      query: { status: 'lost', page: 999, limit: 999 },
    } as any;
    const res = createResponse();

    await opportunitiesController.listOpportunities(req, res);

    expect(mockService.listOpportunities).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ status: 'open', page: 1, limit: 20 })
    );
    expect(mockSendSuccess).toHaveBeenCalled();
  });

  it('getOpportunityById maps missing rows to notFoundMessage', async () => {
    mockService.getOpportunityById.mockResolvedValueOnce(null as never);

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
      validatedParams: { id: 'opp-1' },
    } as any;
    const res = createResponse();

    await opportunitiesController.getOpportunityById(req, res);

    expect(mockNotFoundMessage).toHaveBeenCalledWith(res, 'Opportunity not found');
  });

  it('deleteOpportunity returns 204 for successful deletes', async () => {
    mockService.deleteOpportunity.mockResolvedValueOnce(true as never);

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
      validatedParams: { id: 'opp-1' },
    } as any;
    const res = createResponse();

    await opportunitiesController.deleteOpportunity(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('deleteOpportunity maps missing rows to notFoundMessage', async () => {
    mockService.deleteOpportunity.mockResolvedValueOnce(false as never);

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
      validatedParams: { id: 'opp-1' },
    } as any;
    const res = createResponse();

    await opportunitiesController.deleteOpportunity(req, res);

    expect(mockNotFoundMessage).toHaveBeenCalledWith(res, 'Opportunity not found');
  });

  it('listOpportunities uses serverError for unexpected failures', async () => {
    mockService.listOpportunities.mockRejectedValueOnce(new Error('boom'));

    const req = {
      user: { id: 'user-1' },
      organizationId: 'org-1',
      validatedQuery: {},
    } as any;
    const res = createResponse();

    await opportunitiesController.listOpportunities(req, res);

    expect(mockServerError).toHaveBeenCalledWith(res, 'Failed to fetch opportunities');
  });
});
