import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: analytics route boundary
 *
 * Route components for analytics routes must resolve through feature ownership.
 */

export const Analytics = lazy(() => import('./pages/AnalyticsPage'));
