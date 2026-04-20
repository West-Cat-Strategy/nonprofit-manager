import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: engagement route boundary
 *
 * Route components for engagement routes must resolve through feature ownership.
 */

export const ExternalServiceProviders = lazy(
  () => import('./cases/pages/ExternalServiceProvidersPage')
);
export const OpportunitiesPage = lazy(() => import('./opportunities/pages/OpportunitiesPage'));
export { TaskList, TaskDetail, TaskCreate, TaskEdit } from '../tasks/routeComponents';
export { CaseList, CaseDetail, CaseCreate, CaseEdit } from '../cases/routeComponents';
export { FollowUpsPage } from '../followUps/routeComponents';
export { TeamChatInboxPage } from '../teamChat/routeComponents';
