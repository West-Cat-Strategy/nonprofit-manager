import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

jest.mock('@middleware/domains/platform', () => ({
  documentUpload: {
    single: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
  },
  handleMulterError: (_req: Request, _res: Response, next: NextFunction) => next(),
  publicCaseFormAssetLimiterMiddleware: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (req.headers['x-block-public-case-form-asset'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-case-form-asset' },
      });
      return;
    }
    next();
  },
  publicCaseFormDraftLimiterMiddleware: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (req.headers['x-block-public-case-form-draft'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-case-form-draft' },
      });
      return;
    }
    next();
  },
  publicCaseFormSubmitLimiterMiddleware: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (req.headers['x-block-public-case-form-submit'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-case-form-submit' },
      });
      return;
    }
    next();
  },
}));

jest.mock('../../repositories/caseFormsRepository', () => ({
  CaseFormsRepository: jest.fn(),
}));

jest.mock('../../usecases/caseForms.usecase', () => ({
  CaseFormsUseCase: jest.fn().mockImplementation(() => ({
    getAssignmentDetailByToken: jest.fn(),
    uploadAssetByToken: jest.fn(),
    saveDraftByToken: jest.fn(),
    submitByToken: jest.fn(),
    getResponsePacketByToken: jest.fn(),
  })),
}));

const buildApp = async () => {
  const { createPublicCaseFormsRoutes } = await import('../public');
  const app = express();
  app.use(express.json());
  app.use('/api/v2/public/case-forms', createPublicCaseFormsRoutes());
  return app;
};

describe('public case-form route rate limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies the asset limiter before upload handling', async () => {
    await request(await buildApp())
      .post('/api/v2/public/case-forms/signed-token/assets')
      .set('x-block-public-case-form-asset', '1')
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-case-form-asset');
      });
  });

  it('applies the draft limiter before draft writes', async () => {
    await request(await buildApp())
      .post('/api/v2/public/case-forms/signed-token/draft')
      .set('x-block-public-case-form-draft', '1')
      .send({ answers: {} })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-case-form-draft');
      });
  });

  it('applies the submit limiter before submission writes', async () => {
    await request(await buildApp())
      .post('/api/v2/public/case-forms/signed-token/submit')
      .set('x-block-public-case-form-submit', '1')
      .send({ answers: {} })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-case-form-submit');
      });
  });
});
