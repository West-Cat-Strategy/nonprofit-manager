import type { NextFunction, Request, Response } from 'express';

const mockValidationResult = jest.fn();
const mockValidationErrorResponse = jest.fn();
const mockConflict = jest.fn();
const mockNotFoundMessage = jest.fn();
const mockBadRequest = jest.fn();

const mockPublishingService = {
  createSite: jest.fn(),
  getAnalyticsSummary: jest.fn(),
  getSiteBySubdomain: jest.fn(),
  getSiteByDomain: jest.fn(),
};

jest.mock('express-validator', () => ({
  validationResult: (...args: unknown[]) => mockValidationResult(...args),
}));

jest.mock('@utils/responseHelpers', () => ({
  validationErrorResponse: (...args: unknown[]) => mockValidationErrorResponse(...args),
  conflict: (...args: unknown[]) => mockConflict(...args),
  notFoundMessage: (...args: unknown[]) => mockNotFoundMessage(...args),
  badRequest: (...args: unknown[]) => mockBadRequest(...args),
  forbidden: jest.fn(),
}));

jest.mock('@services/domains/content', () => ({
  getCacheControlHeader: jest.fn(),
  publishingService: mockPublishingService,
  siteCacheService: {
    getStats: jest.fn(),
    invalidateSite: jest.fn(),
    clear: jest.fn(),
    generateCacheKey: jest.fn(),
    get: jest.fn(),
    isNotModified: jest.fn(),
    generateCacheHeaders: jest.fn(() => ({})),
    set: jest.fn(),
  },
}));

import {
  createSite,
  getAnalyticsSummary,
  servePublishedSite,
} from '../../controllers/publishingController';

const createResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const noValidationErrors = () => {
  mockValidationResult.mockReturnValue({ isEmpty: () => true });
};

describe('publishingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    noValidationErrors();
  });

  it('maps createSite uniqueness errors to conflict response', async () => {
    const req = {
      user: { id: 'user-1' },
      body: { templateId: 'tpl-1', name: 'My Site' },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    mockPublishingService.createSite.mockRejectedValueOnce(new Error('subdomain already taken'));

    await createSite(req as any, res, next);

    expect(mockConflict).toHaveBeenCalledWith(res, 'subdomain already taken');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns validation error response when validation fails', async () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'bad data' }],
    });
    const req = { user: { id: 'user-1' }, body: {} } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await createSite(req as any, res, next);

    expect(mockValidationErrorResponse).toHaveBeenCalled();
    expect(mockPublishingService.createSite).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('uses fallback period when analytics period query is invalid', async () => {
    const req = {
      user: { id: 'user-1' },
      params: { siteId: 'site-1' },
      query: { period: 'not-a-number' },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    mockPublishingService.getAnalyticsSummary.mockResolvedValueOnce({ totalPageviews: 0 });

    await getAnalyticsSummary(req as any, res, next);

    expect(mockPublishingService.getAnalyticsSummary).toHaveBeenCalledWith('site-1', 'user-1', 30);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { totalPageviews: 0 },
        totalPageviews: 0,
      })
    );
  });

  it('resolves site by subdomain first, then domain fallback', async () => {
    const req = {
      params: { subdomain: 'alpha' },
      subdomains: ['alpha'],
      hostname: 'example.org',
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    mockPublishingService.getSiteBySubdomain.mockResolvedValueOnce(null);
    mockPublishingService.getSiteByDomain.mockResolvedValueOnce({
      id: 'site-1',
      status: 'published',
      publishedContent: { ok: true },
      analyticsEnabled: true,
    });

    await servePublishedSite(req, res, next);

    expect(mockPublishingService.getSiteBySubdomain).toHaveBeenCalledWith('alpha');
    expect(mockPublishingService.getSiteByDomain).toHaveBeenCalledWith('example.org');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          content: { ok: true },
          analyticsEnabled: true,
        },
        content: { ok: true },
        analyticsEnabled: true,
      })
    );
  });
});
