import express, { type NextFunction, type Response } from 'express';
import request from 'supertest';
import type { AuthRequest } from '@middleware/auth';
import { createPublishingRoutes } from '../index';

jest.mock('@middleware/domains/auth', () => ({
  authenticate: (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.get('x-test-role');
    if (!role) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    req.user = {
      id: `${role}-user`,
      email: `${role}@example.com`,
      role,
    } as AuthRequest['user'];
    next();
  },
}));

jest.mock('@middleware/requireActiveOrganizationContext', () => ({
  requireActiveOrganizationContext: (req: AuthRequest, res: Response, next: NextFunction) => {
    const organizationId = req.get('x-organization-id');
    if (!organizationId) {
      res.status(400).json({ error: 'No organization context' });
      return;
    }

    req.organizationId = organizationId;
    req.accountId = organizationId;
    req.tenantId = organizationId;
    next();
  },
}));

jest.mock('@middleware/permissions', () => ({
  requirePermission: () => (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  },
}));

jest.mock('../../controllers', () => {
  const handler = (name: string) => (_req: AuthRequest, res: Response) =>
    res.status(200).json({ data: { handler: name } });

  return new Proxy(
    { __esModule: true },
    {
      get(target, property: string) {
        if (property in target) {
          return target[property as keyof typeof target];
        }
        return handler(property);
      },
    }
  );
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/sites', createPublishingRoutes());
  return app;
};

const sendRequest = (app: express.Express, method: 'GET' | 'DELETE', path: string) =>
  method === 'GET' ? request(app).get(path) : request(app).delete(path);

describe('publishing cache admin route security', () => {
  it.each([
    ['GET', '/api/v2/sites/admin/cache/stats'],
    ['GET', '/api/v2/sites/admin/cache/profiles'],
    ['DELETE', '/api/v2/sites/admin/cache'],
  ] as const)('%s %s requires authentication', async (method, path) => {
    const app = buildApp();
    await sendRequest(app, method, path).expect(401);
  });

  it('requires active organization context before permission checks', async () => {
    const app = buildApp();

    await request(app)
      .get('/api/v2/sites/admin/cache/profiles')
      .set('x-test-role', 'admin')
      .expect(400);
  });

  it.each([
    ['GET', '/api/v2/sites/admin/cache/stats'],
    ['GET', '/api/v2/sites/admin/cache/profiles'],
    ['DELETE', '/api/v2/sites/admin/cache'],
  ] as const)('%s %s requires admin settings permission', async (method, path) => {
    const app = buildApp();

    await sendRequest(app, method, path)
      .set('x-test-role', 'staff')
      .set('x-organization-id', 'org-1')
      .expect(403);
  });

  it.each([
    ['GET', '/api/v2/sites/admin/cache/stats', 'getCacheStats'],
    ['GET', '/api/v2/sites/admin/cache/profiles', 'getPerformanceCacheControl'],
    ['DELETE', '/api/v2/sites/admin/cache', 'clearAllCache'],
  ] as const)('%s %s reaches the controller for admins', async (method, path, handler) => {
    const app = buildApp();

    const response = await sendRequest(app, method, path)
      .set('x-test-role', 'admin')
      .set('x-organization-id', 'org-1')
      .expect(200);

    expect(response.body).toEqual({ data: { handler } });
  });
});
