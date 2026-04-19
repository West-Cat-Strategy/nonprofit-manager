import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: meetings route boundary
 */

export const MeetingList = lazy(() => import('./pages/MeetingListPage'));
export const MeetingDetail = lazy(() => import('./pages/MeetingDetailPage'));
export const MeetingCreate = lazy(() => import('./pages/MeetingCreatePage'));
export const MeetingEdit = lazy(() => import('./pages/MeetingEditPage'));
