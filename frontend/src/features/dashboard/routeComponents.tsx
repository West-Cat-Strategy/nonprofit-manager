import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: dashboard route boundary
 *
 * Route components for dashboard routes must resolve through feature ownership.
 */

export const CustomDashboard = lazy(() => import('./pages/CustomDashboardPage'));
