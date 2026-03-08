import type { RouteCatalogEntry } from './types';
import { demoRoute } from './shared';

export const demoRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  demoRoute({ id: 'demo-dashboard', title: 'Demo Dashboard', path: '/demo/dashboard' }),
  demoRoute({ id: 'demo-linking', title: 'Demo Linking', path: '/demo/linking' }),
  demoRoute({ id: 'demo-operations', title: 'Demo Operations', path: '/demo/operations' }),
  demoRoute({ id: 'demo-outreach', title: 'Demo Outreach', path: '/demo/outreach' }),
  demoRoute({ id: 'demo-people', title: 'Demo People', path: '/demo/people' }),
  demoRoute({ id: 'demo-audit', title: 'Demo Theme Audit', path: '/demo/audit' }),
];
