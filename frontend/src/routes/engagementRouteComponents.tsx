import { lazy } from 'react';

export const EventList = lazy(() => import('../features/events/pages/EventsHubPage'));
export const EventDetail = lazy(() => import('../features/events/pages/EventDetailPage'));
export const EventCreate = lazy(() => import('../features/events/pages/EventCreatePage'));
export const EventEdit = lazy(() => import('../features/events/pages/EventEditPage'));
export const EventCalendarPage = lazy(() => import('../features/events/pages/EventCalendarPage'));
export const TaskList = lazy(() => import('../pages/engagement/tasks/TaskList'));
export const TaskDetail = lazy(() => import('../pages/engagement/tasks/TaskDetail'));
export const TaskCreate = lazy(() => import('../pages/engagement/tasks/TaskCreate'));
export const TaskEdit = lazy(() => import('../pages/engagement/tasks/TaskEdit'));
export const CaseList = lazy(() => import('../features/cases/pages/CaseListPage'));
export const CaseDetail = lazy(() => import('../features/cases/pages/CaseDetailPage'));
export const CaseCreate = lazy(() => import('../features/cases/pages/CaseCreatePage'));
export const CaseEdit = lazy(() => import('../features/cases/pages/CaseEditPage'));
export const ExternalServiceProviders = lazy(() => import('../pages/engagement/cases/ExternalServiceProviders'));
export const FollowUpsPage = lazy(() => import('../pages/engagement/followUps/FollowUpsPage'));
export const OpportunitiesPage = lazy(() => import('../pages/engagement/opportunities/OpportunitiesPage'));
