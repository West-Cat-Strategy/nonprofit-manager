import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: alerts route boundary
 *
 * Route components for alerts routes must resolve through feature ownership.
 */

export const AlertsOverview = lazy(() => import('./pages/AlertsConfigPage'));
export const AlertInstances = lazy(() => import('./pages/AlertInstancesPage'));
export const AlertHistory = lazy(() => import('./pages/AlertHistoryPage'));
