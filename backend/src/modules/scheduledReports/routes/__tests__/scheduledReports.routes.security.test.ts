import express, { type NextFunction, type Response } from 'express';
import request from 'supertest';
import type { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { createScheduledReportsRoutes } from '../index';

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

    if (!granted.includes(permission)) {
      res.status(403).json({ error: 'Forbidden', permission });
      return;
    }

    next();
  },
}));

jest.mock('../../controllers/scheduledReports.controller', () => ({
  createScheduledReportsController: () => ({
    listScheduledReports: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'listScheduledReports' }),
    getScheduledReport: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'getScheduledReport' }),
    createScheduledReport: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'createScheduledReport' }),
    updateScheduledReport: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'updateScheduledReport' }),
    toggleScheduledReport: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'toggleScheduledReport' }),
    runScheduledReportNow: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'runScheduledReportNow' }),
    deleteScheduledReport: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'deleteScheduledReport' }),
    listScheduledReportRuns: (_req: AuthRequest, res: Response) =>
      res.status(200).json({ handler: 'listScheduledReportRuns' }),
  }),
}));

const reportId = '11111111-1111-4111-8111-111111111111';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/scheduled-reports', createScheduledReportsRoutes());
  return app;
};

const sendRequest = (
  app: express.Express,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string
) => {
  if (method === 'GET') return request(app).get(path);
  if (method === 'POST') return request(app).post(path);
  if (method === 'PUT') return request(app).put(path);
  return request(app).delete(path);
};

describe('scheduled report route permissions', () => {
  it.each([
    ['GET', '/api/v2/scheduled-reports', Permission.SCHEDULED_REPORT_VIEW],
    ['GET', `/api/v2/scheduled-reports/${reportId}`, Permission.SCHEDULED_REPORT_VIEW],
    ['GET', `/api/v2/scheduled-reports/${reportId}/runs`, Permission.SCHEDULED_REPORT_VIEW],
    ['POST', '/api/v2/scheduled-reports', Permission.SCHEDULED_REPORT_MANAGE],
    ['PUT', `/api/v2/scheduled-reports/${reportId}`, Permission.SCHEDULED_REPORT_MANAGE],
    ['POST', `/api/v2/scheduled-reports/${reportId}/toggle`, Permission.SCHEDULED_REPORT_MANAGE],
    ['DELETE', `/api/v2/scheduled-reports/${reportId}`, Permission.SCHEDULED_REPORT_MANAGE],
  ] as const)('%s %s requires %s', async (method, path, permission) => {
    const app = buildApp();

    await sendRequest(app, method, path)
      .set('x-test-role', 'staff')
      .set('x-organization-id', 'org-1')
      .expect(403);

    const response = await sendRequest(app, method, path)
      .set('x-test-role', 'staff')
      .set('x-organization-id', 'org-1')
      .set('x-test-permissions', permission)
      .send({
        saved_report_id: reportId,
        recipients: ['ops@example.org'],
        frequency: 'daily',
        name: 'Daily report',
      })
      .expect(200);

    expect(response.body.handler).toBeTruthy();
  });

  it('requires report export permission for run-now execution', async () => {
    const app = buildApp();

    await request(app)
      .post(`/api/v2/scheduled-reports/${reportId}/run-now`)
      .set('x-test-role', 'staff')
      .set('x-organization-id', 'org-1')
      .set('x-test-permissions', Permission.SCHEDULED_REPORT_MANAGE)
      .expect(403)
      .expect((response) => {
        expect(response.body.permission).toBe(Permission.REPORT_EXPORT);
      });

    const response = await request(app)
      .post(`/api/v2/scheduled-reports/${reportId}/run-now`)
      .set('x-test-role', 'staff')
      .set(
        'x-test-permissions',
        `${Permission.SCHEDULED_REPORT_MANAGE},${Permission.REPORT_EXPORT}`
      )
      .set('x-organization-id', 'org-1')
      .expect(200);

    expect(response.body).toEqual({ handler: 'runScheduledReportNow' });
  });
});
