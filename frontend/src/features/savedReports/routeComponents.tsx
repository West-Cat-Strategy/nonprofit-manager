import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: saved reports route boundary
 *
 * Route components for saved report routes must resolve through feature ownership.
 */

export const SavedReportsRoutePage = lazy(() => import('./pages/SavedReportsPage'));
export const PublicReportSnapshot = lazy(() => import('./pages/PublicReportSnapshotPage'));
