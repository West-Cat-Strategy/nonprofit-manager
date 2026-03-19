import type { NextFunction, Request, Response } from 'express';

const mockConflict = jest.fn();
const mockNotFoundMessage = jest.fn();
const mockBadRequest = jest.fn();

const mockPublishingService = {
  createSite: jest.fn(),
  getAnalyticsSummary: jest.fn(),
  getSiteBySubdomain: jest.fn(),
  getSiteByDomain: jest.fn(),
};

jest.mock('@utils/responseHelpers', () => ({
  conflict: (...args: unknown[]) => mockConflict(...args),
  notFoundMessage: (...args: unknown[]) => mockNotFoundMessage(...args),
  badRequest: (...args: unknown[]) => mockBadRequest(...args),
  forbidden: jest.fn(),
}));

jest.mock('@services/publishing', () => ({
  __esModule: true,
  default: mockPublishingService,
}));

jest.mock('@services/siteCacheService', () => ({
  getCacheControlHeader: jest.fn(),
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
} from '../../modules/publishing/controllers/publishingController';

const createResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('publishingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('forwards unexpected createSite errors to next', async () => {
    const req = { user: { id: 'user-1' }, body: {} } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    const error = new Error('unexpected failure');
    mockPublishingService.createSite.mockRejectedValueOnce(error);

    await createSite(req as any, res, next);

    expect(next).toHaveBeenCalledWith(error);
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

    expect(mockPublishingService.getAnalyticsSummary).toHaveBeenCalledWith(
      'site-1',
      'user-1',
      30,
      undefined
    );
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
