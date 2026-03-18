import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: follow-ups route boundary
 *
 * Route components for follow-up routes must resolve through feature ownership.
 */

export const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage'));
