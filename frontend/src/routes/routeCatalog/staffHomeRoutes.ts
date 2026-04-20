import type { RouteCatalogEntry } from './types';
import { staffRoute } from './shared';

export const staffHomeRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  staffRoute({
    id: 'dashboard',
    title: 'Workbench',
    section: 'Core',
    path: '/dashboard',
    primaryAction: { label: 'Create intake', href: '/intake/new' },
    mobilePriority: 10,
    staffNav: {
      group: 'primary',
      order: 10,
      label: 'Workbench',
      shortLabel: 'Workbench',
      ariaLabel: 'Go to workbench',
      icon: '📊',
    },
  }),
];
