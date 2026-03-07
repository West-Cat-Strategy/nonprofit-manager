import { describe, expect, it } from '@jest/globals';
import { createAnalyticsRoutes } from '@modules/analytics';
import { createDashboardRoutes } from '@modules/dashboard';
import { createFollowUpsRoutes } from '@modules/followUps';
import { createReportsRoutes } from '@modules/reports';
import { createSavedReportsRoutes } from '@modules/savedReports';
import { createScheduledReportsRoutes } from '@modules/scheduledReports';

const getRouteCount = (router: { stack?: unknown[] }): number =>
  Array.isArray(router.stack) ? router.stack.length : 0;

describe('wave 2 modular route construction', () => {
  it('builds routers without placeholder dependency injection', () => {
    const routers = [
      createAnalyticsRoutes(),
      createDashboardRoutes(),
      createFollowUpsRoutes(),
      createReportsRoutes(),
      createSavedReportsRoutes(),
      createScheduledReportsRoutes(),
    ];

    routers.forEach((router) => {
      expect(getRouteCount(router)).toBeGreaterThan(0);
    });
  });
});
