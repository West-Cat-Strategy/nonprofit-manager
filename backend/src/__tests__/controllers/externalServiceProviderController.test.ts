import type { Request, Response } from 'express';
import * as controller from '../../modules/externalServiceProviders/controllers/externalServiceProviderController';
import * as externalServiceProviderService from '../../services/externalServiceProviderService';

jest.mock('../../services/externalServiceProviderService');

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/auditService', () => ({
  appendAuditLog: jest.fn(),
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../modules/shared/http/envelope', () => ({
  sendSuccess: jest.fn((res: Response, data: unknown, status?: number) => {
    if (status) {
      return res.status(status).json(data);
    }
    return res.status(200).json(data);
  }),
}));

jest.mock('../../utils/responseHelpers', () => ({
  badRequest: jest.fn((res: Response, message: string) => res.status(400).json({ message })),
  notFoundMessage: jest.fn((res: Response, message: string) => res.status(404).json({ message })),
  serverError: jest.fn((res: Response, message: string) => res.status(500).json({ message })),
  unauthorized: jest.fn((res: Response, message: string) => res.status(401).json({ message })),
}));

const mockService = externalServiceProviderService as jest.Mocked<typeof externalServiceProviderService>;

const buildResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe('externalServiceProviderController not-found mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when updateProvider cannot find a provider', async () => {
    mockService.updateProvider.mockResolvedValueOnce(null);

    const res = buildResponse();
    await controller.updateExternalServiceProvider(
      {
        params: { id: 'provider-1' },
        body: { provider_name: 'Updated Provider' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when deleteProvider cannot find a provider', async () => {
    mockService.deleteProvider.mockResolvedValueOnce(false);

    const res = buildResponse();
    await controller.deleteExternalServiceProvider(
      {
        params: { id: 'provider-1' },
        user: { id: 'user-1' },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
