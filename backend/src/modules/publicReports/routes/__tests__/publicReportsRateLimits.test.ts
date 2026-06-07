import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { publicReportsV2Routes } from '../index';

jest.mock('@middleware/domains/platform', () => ({
  publicReportTokenLimiterMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-block-public-report-token'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-report-token' },
      });
      return;
    }
    next();
  },
}));

jest.mock('../../controllers/reportSharingController', () => {
  const mocks = {
    getReportByPublicToken: jest.fn((_req: Request, res: Response) => {
      res.status(204).end();
    }),
    downloadPublicReportByToken: jest.fn((_req: Request, res: Response) => {
      res.status(204).end();
    }),
  };

  return {
    __mocks: mocks,
    getReportByPublicToken: mocks.getReportByPublicToken,
    downloadPublicReportByToken: mocks.downloadPublicReportByToken,
  };
});

const reportSharingControllerModule = jest.requireMock(
  '../../controllers/reportSharingController'
) as {
  __mocks: {
    getReportByPublicToken: jest.Mock;
    downloadPublicReportByToken: jest.Mock;
  };
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/public/reports', publicReportsV2Routes);
  return app;
};

describe('public report token route rate limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Bearer-token metadata reads on the supported root route', async () => {
    const app = buildApp();

    await request(app)
      .get('/api/v2/public/reports')
      .set('Authorization', 'Bearer token-123')
      .expect(204);

    expect(reportSharingControllerModule.__mocks.getReportByPublicToken).toHaveBeenCalledTimes(1);
  });

  it('rejects legacy path-token metadata reads before data handlers run', async () => {
    const app = buildApp();

    await request(app)
      .get('/api/v2/public/reports/token-123')
      .expect(410)
      .expect(({ body }) => {
        expect(body.error.code).toBe('legacy_token_path_disabled');
      });

    expect(reportSharingControllerModule.__mocks.getReportByPublicToken).not.toHaveBeenCalled();
  });

  it('rejects legacy path-token downloads before data handlers run', async () => {
    const app = buildApp();

    await request(app)
      .get('/api/v2/public/reports/token-123/download?format=csv')
      .expect(410)
      .expect(({ body }) => {
        expect(body.error.code).toBe('legacy_token_path_disabled');
      });

    expect(
      reportSharingControllerModule.__mocks.downloadPublicReportByToken
    ).not.toHaveBeenCalled();
  });

  it('applies the public report token limiter to metadata reads', async () => {
    const app = buildApp();

    await request(app)
      .get('/api/v2/public/reports/token-123')
      .set('x-block-public-report-token', '1')
      .expect(429);
  });

  it('applies the public report token limiter to downloads', async () => {
    const app = buildApp();

    await request(app)
      .get('/api/v2/public/reports/token-123/download?format=csv')
      .set('x-block-public-report-token', '1')
      .expect(429);
  });
});
