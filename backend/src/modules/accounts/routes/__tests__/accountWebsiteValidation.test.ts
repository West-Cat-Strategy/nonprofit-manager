import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

jest.mock('@middleware/domains/auth', () => ({
  authenticate: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('@middleware/domains/data', () => ({
  loadDataScope: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('@middleware/permissions', () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../controllers/accounts.controller', () => ({
  createAccountsController: jest.fn(() => ({
    getAccounts: jest.fn(),
    getAccountById: jest.fn(),
    createAccount: jest.fn((_req: Request, res: Response) => {
      res.status(201).json({ success: true, data: { id: 'account-1' } });
    }),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    importAccountsPreview: jest.fn(),
    importAccountsCommit: jest.fn(),
    exportAccounts: jest.fn(),
    downloadImportTemplate: jest.fn(),
    previewImport: jest.fn(),
    commitImport: jest.fn(),
    getAccountContacts: jest.fn(),
  })),
}));

const buildApp = async () => {
  const { createAccountsRoutes } = await import('../index');
  const app = express();
  app.use(express.json());
  app.use('/api/v2/accounts', createAccountsRoutes());
  return app;
};

describe('account website validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validPayload = {
    account_name: 'Partner Org',
    account_type: 'organization',
    website: 'https://example.org',
  };

  it.each(['javascript:alert(1)', 'data:text/html,hi', '//example.org', 'not a url'])(
    'rejects unsafe website URL %s',
    async (website) => {
      await request(await buildApp())
        .post('/api/v2/accounts')
        .send({ ...validPayload, website })
        .expect(400);
    }
  );

  it('accepts blank website values as omitted', async () => {
    await request(await buildApp())
      .post('/api/v2/accounts')
      .send({ ...validPayload, website: '' })
      .expect(201);
  });
});
