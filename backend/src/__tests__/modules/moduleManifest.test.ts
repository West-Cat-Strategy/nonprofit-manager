import { describe, expect, it } from '@jest/globals';
import { Router } from 'express';
import { activitiesV2Routes } from '@modules/activities';
import { activitiesModule } from '@modules/activities/module';
import { alertsV2Routes } from '@modules/alerts';
import { alertsModule } from '@modules/alerts/module';
import { dashboardV2Routes } from '@modules/dashboard';
import { dashboardModule } from '@modules/dashboard/module';
import { defineBackendModule } from '@modules/moduleManifest';

describe('backend module declarations', () => {
  it('normalizes declarations into pure immutable metadata', () => {
    const router = Router();
    const routeDeclarations = [{ mountPath: '/sample' as const, router }];
    const schedulerDeclarations = [{ id: 'sample-daily' }];
    const providerDeclarations = [{ id: 'sample-provider' }];

    const module = defineBackendModule({
      id: 'sample',
      domainFamily: 'engagement',
      routes: routeDeclarations,
      schedulers: schedulerDeclarations,
      providers: providerDeclarations,
    });

    routeDeclarations.push({ mountPath: '/mutated' as const, router: Router() });
    schedulerDeclarations.push({ id: 'mutated-scheduler' });
    providerDeclarations.push({ id: 'mutated-provider' });

    expect(module).toEqual({
      id: 'sample',
      domainFamily: 'engagement',
      workspaceKey: undefined,
      routes: [{ mountPath: '/sample', router }],
      publicRoutes: [],
      schedulers: [{ id: 'sample-daily' }],
      providers: [{ id: 'sample-provider' }],
    });
    expect(Object.isFrozen(module)).toBe(true);
    expect(Object.isFrozen(module.routes)).toBe(true);
    expect(Object.isFrozen(module.routes[0])).toBe(true);
    expect(Object.isFrozen(module.publicRoutes)).toBe(true);
    expect(Object.isFrozen(module.schedulers)).toBe(true);
    expect(Object.isFrozen(module.providers)).toBe(true);
  });

  it('reuses existing route exports without changing registration ownership', () => {
    expect(activitiesModule).toMatchObject({
      id: 'activities',
      domainFamily: 'engagement',
      publicRoutes: [],
      schedulers: [],
      providers: [],
    });
    expect(activitiesModule.routes).toHaveLength(1);
    expect(activitiesModule.routes[0]).toMatchObject({ mountPath: '/activities' });
    expect(activitiesModule.routes[0]?.router).toBe(activitiesV2Routes);

    expect(alertsModule).toMatchObject({
      id: 'alerts',
      domainFamily: 'reporting-analytics',
      workspaceKey: 'alerts',
      publicRoutes: [],
      schedulers: [],
      providers: [],
    });
    expect(alertsModule.routes).toHaveLength(1);
    expect(alertsModule.routes[0]).toMatchObject({ mountPath: '/alerts' });
    expect(alertsModule.routes[0]?.router).toBe(alertsV2Routes);

    expect(dashboardModule).toMatchObject({
      id: 'dashboard',
      domainFamily: 'reporting-analytics',
      publicRoutes: [],
      schedulers: [],
      providers: [],
    });
    expect(dashboardModule.routes).toHaveLength(1);
    expect(dashboardModule.routes[0]).toMatchObject({ mountPath: '/dashboard' });
    expect(dashboardModule.routes[0]?.router).toBe(dashboardV2Routes);
  });
});
