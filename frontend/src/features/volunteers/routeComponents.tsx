import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: volunteers route boundary
 *
 * Route components for volunteer routes must resolve through feature ownership.
 */

export const VolunteerList = lazy(() => import('./pages/VolunteerListPage'));
export const VolunteerDetail = lazy(() => import('./pages/VolunteerDetailPage'));
export const VolunteerCreate = lazy(() => import('./pages/VolunteerCreatePage'));
export const VolunteerEdit = lazy(() => import('./pages/VolunteerEditPage'));
export const AssignmentCreate = lazy(() => import('./pages/AssignmentCreatePage'));
export const AssignmentEdit = lazy(() => import('./pages/AssignmentEditPage'));
