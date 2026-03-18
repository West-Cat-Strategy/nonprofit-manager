import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: workflows route boundary
 *
 * Route components for workflow routes must resolve through feature ownership.
 */

export const IntakeNew = lazy(() => import('./pages/IntakeNewPage'));
export const InteractionNote = lazy(() => import('./pages/InteractionNotePage'));
