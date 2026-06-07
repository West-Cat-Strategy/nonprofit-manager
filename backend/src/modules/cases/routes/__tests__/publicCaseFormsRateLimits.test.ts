import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

const legacyToken = 'a'.repeat(32);
const mockCaseFormsUseCase = {
  getAssignmentDetailByToken: jest.fn().mockResolvedValue({ id: 'assignment-1' }),
  uploadAssetByToken: jest.fn(),
  saveDraftByToken: jest.fn(),
  submitByToken: jest.fn(),
  getResponsePacketByToken: jest.fn(),
};

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
  CaseFormsUseCase: jest.fn().mockImplementation(() => mockCaseFormsUseCase),
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
    mockCaseFormsUseCase.getAssignmentDetailByToken.mockResolvedValue({ id: 'assignment-1' });
  });

  it('keeps Bearer-token form reads on the supported root route', async () => {
    await request(await buildApp())
      .get('/api/v2/public/case-forms')
      .set('Authorization', 'Bearer supported-token')
      .expect(200);

    expect(mockCaseFormsUseCase.getAssignmentDetailByToken).toHaveBeenCalledWith(
      'supported-token'
    );
  });

  it('rejects legacy path-token form reads before data handlers run', async () => {
    await request(await buildApp())
      .get(`/api/v2/public/case-forms/${legacyToken}`)
      .expect(410)
      .expect(({ body }) => {
        expect(body.error.code).toBe('legacy_token_path_disabled');
      });

    expect(mockCaseFormsUseCase.getAssignmentDetailByToken).not.toHaveBeenCalled();
  });

  it('rejects legacy path-token draft and submit writes before use-case mutations run', async () => {
    await request(await buildApp())
      .post(`/api/v2/public/case-forms/${legacyToken}/draft`)
      .send({ answers: {} })
      .expect(410)
      .expect(({ body }) => {
        expect(body.error.code).toBe('legacy_token_path_disabled');
      });
    await request(await buildApp())
      .post(`/api/v2/public/case-forms/${legacyToken}/submit`)
      .send({ answers: {} })
      .expect(410)
      .expect(({ body }) => {
        expect(body.error.code).toBe('legacy_token_path_disabled');
      });

    expect(mockCaseFormsUseCase.saveDraftByToken).not.toHaveBeenCalled();
    expect(mockCaseFormsUseCase.submitByToken).not.toHaveBeenCalled();
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
