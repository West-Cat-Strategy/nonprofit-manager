import { lazy } from 'react';

export const EventList = lazy(() => import('../pages/engagement/events/EventList'));
export const EventDetail = lazy(() => import('../pages/engagement/events/EventDetail'));
export const EventCreate = lazy(() => import('../pages/engagement/events/EventCreate'));
export const EventEdit = lazy(() => import('../pages/engagement/events/EventEdit'));
export const EventCalendarPage = lazy(() => import('../pages/engagement/events/EventCalendarPage'));
export const TaskList = lazy(() => import('../pages/engagement/tasks/TaskList'));
export const TaskDetail = lazy(() => import('../pages/engagement/tasks/TaskDetail'));
export const TaskCreate = lazy(() => import('../pages/engagement/tasks/TaskCreate'));
export const TaskEdit = lazy(() => import('../pages/engagement/tasks/TaskEdit'));
export const CaseList = lazy(() => import('../pages/engagement/cases/CaseList'));
export const CaseDetail = lazy(() => import('../pages/engagement/cases/CaseDetail'));
export const CaseCreate = lazy(() => import('../pages/engagement/cases/CaseCreate'));
export const CaseEdit = lazy(() => import('../pages/engagement/cases/CaseEdit'));
