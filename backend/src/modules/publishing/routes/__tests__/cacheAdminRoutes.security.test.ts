import express, { type NextFunction, type Response } from 'express';
import request from 'supertest';
import type { AuthRequest } from '@middleware/auth';
import { createPublishingRoutes } from '../index';
import { Permission } from '@utils/permissions';

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
  requirePermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => {
    const granted = (req.get('x-test-permissions') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (req.user?.role !== 'admin' && !granted.includes(permission)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.locals.requiredPermission = permission;
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

const sendRequest = (app: express.Express, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string) => {
  if (method === 'GET') return request(app).get(path);
  if (method === 'POST') return request(app).post(path);
  if (method === 'PUT') return request(app).put(path);
  return request(app).delete(path);
};

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
  ] as const)('%s %s requires publishing cache permission', async (method, path) => {
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

  it.each([
    ['POST', '/api/v2/sites', Permission.PUBLISHING_SITE_MANAGE],
    ['PUT', '/api/v2/sites/11111111-1111-4111-8111-111111111111', Permission.PUBLISHING_SITE_MANAGE],
    ['DELETE', '/api/v2/sites/11111111-1111-4111-8111-111111111111', Permission.PUBLISHING_SITE_MANAGE],
    ['POST', '/api/v2/sites/publish', Permission.PUBLISHING_SITE_PUBLISH],
    [
      'PUT',
      '/api/v2/sites/11111111-1111-4111-8111-111111111111/integrations/mailchimp',
      Permission.PUBLISHING_INTEGRATION_MANAGE,
    ],
    [
      'POST',
      '/api/v2/sites/11111111-1111-4111-8111-111111111111/domain',
      Permission.PUBLISHING_DOMAIN_MANAGE,
    ],
    [
      'POST',
      '/api/v2/sites/11111111-1111-4111-8111-111111111111/cache/invalidate',
      Permission.PUBLISHING_CACHE_MANAGE,
    ],
  ] as const)('%s %s rejects authenticated users without %s', async (method, path) => {
    const app = buildApp();

    await sendRequest(app, method, path)
      .set('x-test-role', 'staff')
      .set('x-organization-id', 'org-1')
      .expect(403);
  });

  it.each([
    ['GET', '/api/v2/sites', Permission.PUBLISHING_SITE_VIEW, 'listSitesForConsole', {}],
    [
      'POST',
      '/api/v2/sites',
      Permission.PUBLISHING_SITE_MANAGE,
      'createSite',
      {
        templateId: '11111111-1111-4111-8111-111111111111',
        name: 'Test site',
      },
    ],
    [
      'POST',
      '/api/v2/sites/publish',
      Permission.PUBLISHING_SITE_PUBLISH,
      'publishSite',
      { templateId: '11111111-1111-4111-8111-111111111111' },
    ],
    [
      'PUT',
      '/api/v2/sites/11111111-1111-4111-8111-111111111111/integrations/mailchimp',
      Permission.PUBLISHING_INTEGRATION_MANAGE,
      'updateSiteMailchimpIntegration',
      { syncEnabled: true },
    ],
    [
      'POST',
      '/api/v2/sites/11111111-1111-4111-8111-111111111111/domain',
      Permission.PUBLISHING_DOMAIN_MANAGE,
      'addCustomDomain',
      { domain: 'example.org' },
    ],
    [
      'POST',
      '/api/v2/sites/11111111-1111-4111-8111-111111111111/cache/invalidate',
      Permission.PUBLISHING_CACHE_MANAGE,
      'invalidateSiteCache',
      {},
    ],
  ] as const)('%s %s accepts scoped %s grants', async (method, path, permission, handler, body) => {
    const app = buildApp();

    const response = await sendRequest(app, method, path)
      .set('x-test-role', 'staff')
      .set('x-organization-id', 'org-1')
      .set('x-test-permissions', permission)
      .send(body)
      .expect(200);

    expect(response.body).toEqual({ data: { handler } });
  });
});
