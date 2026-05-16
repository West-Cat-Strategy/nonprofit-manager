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

jest.mock('../../controllers/reportSharingController', () => ({
  getReportByPublicToken: (_req: Request, res: Response) => {
    res.status(204).end();
  },
  downloadPublicReportByToken: (_req: Request, res: Response) => {
    res.status(204).end();
  },
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/public/reports', publicReportsV2Routes);
  return app;
};

describe('public report token route rate limits', () => {
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
