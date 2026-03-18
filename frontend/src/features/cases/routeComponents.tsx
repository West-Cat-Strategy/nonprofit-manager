import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: cases route boundary
 *
 * Route components for case routes must resolve through feature ownership.
 */

export const CaseList = lazy(() => import('./pages/CaseListPage'));
export const CaseDetail = lazy(() => import('./pages/CaseDetailPage'));
export const CaseCreate = lazy(() => import('./pages/CaseCreatePage'));
export const CaseEdit = lazy(() => import('./pages/CaseEditPage'));
