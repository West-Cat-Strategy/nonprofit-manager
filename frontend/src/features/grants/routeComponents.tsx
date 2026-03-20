import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: grants route boundary
 *
 * Route components for grants routes must resolve through feature ownership.
 */

export const GrantsPage = lazy(() => import('./pages/GrantsPage'));
