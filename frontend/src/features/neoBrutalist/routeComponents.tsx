import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: neo-brutalist route boundary
 *
 * Route components for neo-brutalist routes must resolve through feature ownership.
 */

export const NeoBrutalistDashboard = lazy(
  () => import('./pages/NeoBrutalistDashboardPage')
);
export const LinkingModule = lazy(() => import('./pages/LinkingModulePage'));
export const OperationsBoard = lazy(() => import('./pages/OperationsBoardPage'));
export const OutreachCenter = lazy(() => import('./pages/OutreachCenterPage'));
export const PeopleDirectory = lazy(() => import('./pages/PeopleDirectoryPage'));
export const ThemeAudit = lazy(() => import('./pages/ThemeAuditPage'));
