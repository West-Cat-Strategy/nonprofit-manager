import express from 'express';
import type { Response } from 'express';
import request from 'supertest';

const controllerMocks = {
  getExternalServiceProviders: jest.fn((_req: unknown, res: Response) => res.status(200).json({ providers: [] })),
  createExternalServiceProvider: jest.fn((_req: unknown, res: Response) => res.status(201).json({ provider: {} })),
  updateExternalServiceProvider: jest.fn((_req: unknown, res: Response) => res.status(200).json({ provider: {} })),
  deleteExternalServiceProvider: jest.fn((_req: unknown, res: Response) => res.status(200).json({ message: 'archived' })),
};

jest.mock('../controllers', () => controllerMocks);
jest.mock('@middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('@middleware/requireActiveOrganizationContext', () => ({
  requireActiveOrganizationContext: (req: { organizationId?: string }, _res: unknown, next: () => void) => {
    req.organizationId = '00000000-0000-4000-8000-000000000001';
    next();
  },
}));

import { createExternalServiceProvidersRoutes } from '../routes';

const buildApp = (role: string) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as { user?: { id: string; email: string; role: string } }).user = {
      id: '00000000-0000-4000-8000-000000000010',
      email: `${role}@example.com`,
      role,
    };
    next();
  });
  app.use('/api/v2/external-service-providers', createExternalServiceProvidersRoutes());
  return app;
};

describe('external service provider route security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows non-admin users to list providers', async () => {
    await request(buildApp('manager'))
      .get('/api/v2/external-service-providers')
      .expect(200);

    expect(controllerMocks.getExternalServiceProviders).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['post', '/api/v2/external-service-providers'],
    ['put', '/api/v2/external-service-providers/00000000-0000-4000-8000-000000000099'],
    ['delete', '/api/v2/external-service-providers/00000000-0000-4000-8000-000000000099'],
  ] as const)('rejects manager %s %s writes', async (method, path) => {
    const agent = request(buildApp('manager'));
    const response = await agent[method](path).send({ provider_name: 'Referral Partner' }).expect(403);

    expect(response.body.error?.message).toMatch(/admin:settings/);
    expect(controllerMocks.createExternalServiceProvider).not.toHaveBeenCalled();
    expect(controllerMocks.updateExternalServiceProvider).not.toHaveBeenCalled();
    expect(controllerMocks.deleteExternalServiceProvider).not.toHaveBeenCalled();
  });

  it('allows admins to create providers', async () => {
    await request(buildApp('admin'))
      .post('/api/v2/external-service-providers')
      .send({ provider_name: 'Referral Partner' })
      .expect(201);

    expect(controllerMocks.createExternalServiceProvider).toHaveBeenCalledTimes(1);
  });
});
