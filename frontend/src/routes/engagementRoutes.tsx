/**
 * Engagement Routes
 * Handles events, tasks, and cases
 */

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load event pages
const EventList = lazy(() => import('../pages/engagement/events/EventList'));
const EventDetail = lazy(() => import('../pages/engagement/events/EventDetail'));
const EventCreate = lazy(() => import('../pages/engagement/events/EventCreate'));
const EventEdit = lazy(() => import('../pages/engagement/events/EventEdit'));
const EventCalendarPage = lazy(() => import('../pages/engagement/events/EventCalendarPage'));

// Lazy load task pages
const TaskList = lazy(() => import('../pages/engagement/tasks/TaskList'));
const TaskDetail = lazy(() => import('../pages/engagement/tasks/TaskDetail'));
const TaskCreate = lazy(() => import('../pages/engagement/tasks/TaskCreate'));
const TaskEdit = lazy(() => import('../pages/engagement/tasks/TaskEdit'));

// Lazy load case pages
const CaseList = lazy(() => import('../pages/engagement/cases/CaseList'));
const CaseDetail = lazy(() => import('../pages/engagement/cases/CaseDetail'));
const CaseCreate = lazy(() => import('../pages/engagement/cases/CaseCreate'));
const CaseEdit = lazy(() => import('../pages/engagement/cases/CaseEdit'));

interface RouteWrapperProps {
  children: ReactNode;
}

export function createEngagementRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      {/* Event Routes */}
      <Route
        path="/events"
        element={<ProtectedRoute><EventList /></ProtectedRoute>}
      />
      <Route
        path="/events/calendar"
        element={<ProtectedRoute><EventCalendarPage /></ProtectedRoute>}
      />
      <Route
        path="/events/new"
        element={<ProtectedRoute><EventCreate /></ProtectedRoute>}
      />
      <Route
        path="/events/:id/edit"
        element={<ProtectedRoute><EventEdit /></ProtectedRoute>}
      />
      <Route
        path="/events/:id"
        element={<ProtectedRoute><EventDetail /></ProtectedRoute>}
      />

      {/* Task Routes */}
      <Route
        path="/tasks"
        element={<ProtectedRoute><TaskList /></ProtectedRoute>}
      />
      <Route
        path="/tasks/new"
        element={<ProtectedRoute><TaskCreate /></ProtectedRoute>}
      />
      <Route
        path="/tasks/:id/edit"
        element={<ProtectedRoute><TaskEdit /></ProtectedRoute>}
      />
      <Route
        path="/tasks/:id"
        element={<ProtectedRoute><TaskDetail /></ProtectedRoute>}
      />

      {/* Case Routes */}
      <Route
        path="/cases"
        element={<ProtectedRoute><CaseList /></ProtectedRoute>}
      />
      <Route
        path="/cases/new"
        element={<ProtectedRoute><CaseCreate /></ProtectedRoute>}
      />
      <Route
        path="/cases/:id/edit"
        element={<ProtectedRoute><CaseEdit /></ProtectedRoute>}
      />
      <Route
        path="/cases/:id"
        element={<ProtectedRoute><CaseDetail /></ProtectedRoute>}
      />
    </>
  );
}

// Re-export lazy components for backwards compatibility
export {
  EventList,
  EventDetail,
  EventCreate,
  EventEdit,
  EventCalendarPage,
  TaskList,
  TaskDetail,
  TaskCreate,
  TaskEdit,
  CaseList,
  CaseDetail,
  CaseCreate,
  CaseEdit,
};
