import type { RouteCatalogEntry } from './types';
import { portalRoute } from './shared';

export const portalRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  portalRoute({
    id: 'portal-dashboard',
    title: 'Portal Dashboard',
    path: '/portal',
    portalNav: { order: 10, label: 'Dashboard' },
  }),
  portalRoute({
    id: 'portal-profile',
    title: 'Your Profile',
    path: '/portal/profile',
    portalNav: { order: 20, label: 'Profile' },
  }),
  portalRoute({
    id: 'portal-people',
    title: 'People',
    path: '/portal/people',
    portalNav: { order: 30, label: 'People' },
  }),
  portalRoute({
    id: 'portal-events',
    title: 'Events',
    path: '/portal/events',
    portalNav: { order: 40, label: 'Events' },
  }),
  portalRoute({
    id: 'portal-messages',
    title: 'Messages',
    path: '/portal/messages',
    portalNav: { order: 50, label: 'Messages' },
  }),
  portalRoute({
    id: 'portal-cases',
    title: 'Cases',
    path: '/portal/cases',
    portalNav: { order: 60, label: 'Cases' },
  }),
  portalRoute({
    id: 'portal-case-detail',
    title: 'Case Detail',
    path: '/portal/cases/:id',
  }),
  portalRoute({
    id: 'portal-appointments',
    title: 'Appointments',
    path: '/portal/appointments',
    portalNav: { order: 70, label: 'Appointments' },
  }),
  portalRoute({
    id: 'portal-documents',
    title: 'Documents',
    path: '/portal/documents',
    portalNav: { order: 80, label: 'Documents' },
  }),
  portalRoute({
    id: 'portal-notes',
    title: 'Notes',
    path: '/portal/notes',
    portalNav: { order: 90, label: 'Notes' },
  }),
  portalRoute({
    id: 'portal-forms',
    title: 'Forms',
    path: '/portal/forms',
    portalNav: { order: 100, label: 'Forms' },
  }),
  portalRoute({
    id: 'portal-reminders',
    title: 'Reminders',
    path: '/portal/reminders',
    portalNav: { order: 110, label: 'Reminders' },
  }),
];
