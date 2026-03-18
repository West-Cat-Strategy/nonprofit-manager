import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: events route boundary
 *
 * Route components for event routes must resolve through feature ownership.
 */

export const EventList = lazy(() => import('./pages/EventsHubPage'));
export const EventDetail = lazy(() => import('./pages/EventDetailPage'));
export const EventCreate = lazy(() => import('./pages/EventCreatePage'));
export const EventEdit = lazy(() => import('./pages/EventEditPage'));
export const EventCalendarPage = lazy(() => import('./pages/EventCalendarPage'));
export const EventCheckInDesk = lazy(() => import('./pages/EventCheckInDeskPage'));
export const PublicEventsPage = lazy(() => import('./pages/PublicEventsPage'));
export const PublicEventCheckInPage = lazy(() => import('./pages/PublicEventCheckInPage'));
