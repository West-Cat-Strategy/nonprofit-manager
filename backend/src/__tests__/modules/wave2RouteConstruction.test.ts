import { describe, expect, it } from '@jest/globals';
import { analyticsV2Routes } from '@modules/analytics';
import { dashboardV2Routes } from '@modules/dashboard';
import { followUpsV2Routes } from '@modules/followUps';
import { reportsV2Routes } from '@modules/reports';
import { savedReportsV2Routes } from '@modules/savedReports';
import { scheduledReportsV2Routes } from '@modules/scheduledReports';

const getRouteCount = (router: { stack?: unknown[] }): number =>
  Array.isArray(router.stack) ? router.stack.length : 0;

const hasPostRoute = (
  router: { stack?: Array<{ route?: { path: string; methods?: Record<string, boolean> } }> },
  path: string
): boolean =>
  Array.isArray(router.stack) &&
  router.stack.some((layer) => layer.route?.path === path && layer.route.methods?.post === true);

describe('wave 2 modular route construction', () => {
  it('builds routers without placeholder dependency injection', () => {
    const routers = [
      analyticsV2Routes,
      dashboardV2Routes,
      followUpsV2Routes,
      reportsV2Routes,
      savedReportsV2Routes,
      scheduledReportsV2Routes,
    ];

    routers.forEach((router) => {
      expect(getRouteCount(router)).toBeGreaterThan(0);
    });
  });

  it('keeps manual report exports on the queued export route only', () => {
    expect(hasPostRoute(reportsV2Routes, '/export')).toBe(false);
    expect(hasPostRoute(reportsV2Routes, '/exports')).toBe(true);
  });
});
