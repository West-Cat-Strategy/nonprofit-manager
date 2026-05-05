import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import {
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
} from '@services/queueViewDefinitionService';
import { getDashboardWorkqueueSummary } from '../services/workqueueSummaryService';

jest.mock('@middleware/domains/auth', () => {
  const actual = jest.requireActual('@middleware/domains/auth');
  return {
    ...actual,
    authenticate: (req: Request, res: Response, next: NextFunction) => {
      if (!(req as Request & { user?: { id: string } }).user) {
        res.status(401).json({
          success: false,
          error: { code: 'unauthorized', message: 'Unauthorized' },
        });
        return;
      }

      next();
    },
  };
});

jest.mock('@services/queueViewDefinitionService', () => ({
  archiveQueueViewDefinition: jest.fn(),
  listQueueViewDefinitions: jest.fn(),
  upsertQueueViewDefinition: jest.fn(),
}));

jest.mock('../services/workqueueSummaryService', () => ({
  getDashboardWorkqueueSummary: jest.fn(),
}));

import { createDashboardRoutes } from '../routes';

const mockListQueueViewDefinitions = listQueueViewDefinitions as jest.MockedFunction<
  typeof listQueueViewDefinitions
>;
const mockUpsertQueueViewDefinition = upsertQueueViewDefinition as jest.MockedFunction<
  typeof upsertQueueViewDefinition
>;
const mockGetDashboardWorkqueueSummary = getDashboardWorkqueueSummary as jest.MockedFunction<
  typeof getDashboardWorkqueueSummary
>;

const buildApp = (
  user?: { id: string; role?: string },
  organizationId?: string
) => {
  const app = express();
  app.use(express.json());

  if (user) {
    app.use((req, _res, next) => {
      (req as Request & {
        accountId?: string;
        organizationId?: string;
        user?: { id: string; role?: string };
      }).user = user;
      (req as Request & { accountId?: string; organizationId?: string }).organizationId =
        organizationId;
      next();
    });
  }

  app.use('/api/v2/dashboard', createDashboardRoutes());
  return app;
};

const workbenchQueueView = {
  id: '11111111-1111-4111-8111-111111111111',
  ownerUserId: 'user-1',
  surface: 'workbench' as const,
  name: 'Urgent intake queue',
  filters: {},
  columns: [],
  sort: {},
  rowLimit: 10,
  dashboardBehavior: { href: '/cases?quick_filter=urgent' },
  rowActions: [],
  emptyState: {},
  permissionScope: ['workbench'],
  status: 'active' as const,
  createdAt: new Date('2026-04-29T00:00:00Z'),
  updatedAt: new Date('2026-04-29T00:00:00Z'),
};

describe('dashboard workbench queue view routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps workbench queue views behind dashboard authentication', async () => {
    const app = buildApp();

    const response = await request(app).get('/api/v2/dashboard/queue-views').expect(401);

    expect(response.body.success).toBe(false);
    expect(mockListQueueViewDefinitions).not.toHaveBeenCalled();
  });

  it('lists owner-scoped workbench queue views for the dashboard surface', async () => {
    mockListQueueViewDefinitions.mockResolvedValueOnce([workbenchQueueView]);
    const app = buildApp({ id: 'user-1' });

    const response = await request(app).get('/api/v2/dashboard/queue-views').expect(200);

    expect(mockListQueueViewDefinitions).toHaveBeenCalledWith('workbench', 'user-1', [
      'workbench',
    ]);
    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          id: workbenchQueueView.id,
          surface: 'workbench',
          name: 'Urgent intake queue',
          dashboardBehavior: { href: '/cases?quick_filter=urgent' },
          permissionScope: ['workbench'],
        },
      ],
    });
  });

  it('forces dashboard-saved queue views onto the workbench surface and scope', async () => {
    mockUpsertQueueViewDefinition.mockResolvedValueOnce(workbenchQueueView);
    const app = buildApp({ id: 'user-1' });

    const response = await request(app)
      .post('/api/v2/dashboard/queue-views')
      .send({
        name: 'Urgent intake queue',
        filters: { quick_filter: 'urgent' },
        dashboardBehavior: { href: '/cases?quick_filter=urgent' },
      })
      .expect(201);

    expect(mockUpsertQueueViewDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: 'workbench',
        ownerUserId: 'user-1',
        permissionScope: ['workbench'],
        userId: 'user-1',
        name: 'Urgent intake queue',
      })
    );
    expect(response.body.data.surface).toBe('workbench');
  });

  it('keeps workqueue summaries behind dashboard authentication', async () => {
    const app = buildApp();

    const response = await request(app).get('/api/v2/dashboard/workqueue-summary').expect(401);

    expect(response.body.success).toBe(false);
    expect(mockGetDashboardWorkqueueSummary).not.toHaveBeenCalled();
  });

  it('returns permission-filtered workqueue summaries for the authenticated dashboard user', async () => {
    mockGetDashboardWorkqueueSummary.mockResolvedValueOnce([
      {
        id: 'intake_resolution',
        label: 'Intake resolution',
        count: 2,
        detail: '2 portal signup requests need contact matching.',
        permissionScope: ['admin:users'],
        primaryAction: {
          label: 'Resolve portal signups',
          href: '/settings/admin/portal/access',
        },
      },
    ]);
    const app = buildApp({ id: 'user-1', role: 'admin' }, 'account-1');

    const response = await request(app)
      .get('/api/v2/dashboard/workqueue-summary')
      .expect(200);

    expect(mockGetDashboardWorkqueueSummary).toHaveBeenCalledWith({
      userId: 'user-1',
      role: 'admin',
      roles: undefined,
      organizationId: 'account-1',
    });
    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          id: 'intake_resolution',
          count: 2,
          primaryAction: { href: '/settings/admin/portal/access' },
        },
      ],
    });
  });
});
