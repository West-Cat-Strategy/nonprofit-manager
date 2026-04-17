import type { RouteCatalogEntry } from './types';
import { staffRoute } from './shared';

export const staffHomeRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  staffRoute({
    id: 'dashboard',
    title: 'Dashboard',
    section: 'Core',
    path: '/dashboard',
    primaryAction: { label: 'Create intake', href: '/intake/new' },
    mobilePriority: 10,
    staffNav: {
      group: 'primary',
      order: 10,
      label: 'Dashboard',
      shortLabel: 'Home',
      ariaLabel: 'Go to dashboard',
      icon: '📊',
    },
  }),
];

export const staffHomeRouteCatalogAuditTargets = [{ path: '/dashboard' }] as const;
