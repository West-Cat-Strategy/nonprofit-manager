import type { RouteCatalogEntry } from './types';
import { demoRoute } from './shared';
import { DEMO_ROUTES_ENABLED_ENV } from '../../services/loop/demoFlags';

export { DEMO_ROUTES_ENABLED_ENV } from '../../services/loop/demoFlags';

const demoFixtureRoute = (
  entry: Omit<
    Parameters<typeof demoRoute>[0],
    'featureFlagEnv' | 'featureStatus'
  >
): RouteCatalogEntry =>
  demoRoute({
    ...entry,
    featureFlagEnv: DEMO_ROUTES_ENABLED_ENV,
    featureStatus: 'flag-disabled',
  });

export const demoRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  demoFixtureRoute({ id: 'demo-dashboard', title: 'Demo Dashboard', path: '/demo/dashboard' }),
  demoFixtureRoute({ id: 'demo-linking', title: 'Demo Linking', path: '/demo/linking' }),
  demoFixtureRoute({ id: 'demo-operations', title: 'Demo Operations', path: '/demo/operations' }),
  demoFixtureRoute({ id: 'demo-outreach', title: 'Demo Outreach', path: '/demo/outreach' }),
  demoFixtureRoute({ id: 'demo-people', title: 'Demo People', path: '/demo/people' }),
  demoFixtureRoute({ id: 'demo-audit', title: 'Demo Theme Audit', path: '/demo/audit' }),
];
