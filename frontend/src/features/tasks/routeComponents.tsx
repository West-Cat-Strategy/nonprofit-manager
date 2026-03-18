import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: tasks route boundary
 *
 * Route components for task routes must resolve through feature ownership.
 */

export const TaskList = lazy(() => import('./pages/TaskListPage'));
export const TaskDetail = lazy(() => import('./pages/TaskDetailPage'));
export const TaskCreate = lazy(() => import('./pages/TaskCreatePage'));
export const TaskEdit = lazy(() => import('./pages/TaskEditPage'));
