/**
 * Engagement Routes
 * Handles events, tasks, and cases
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { EventList, EventDetail, EventCreate, EventEdit, EventCalendarPage, TaskList, TaskDetail, TaskCreate, TaskEdit, CaseList, CaseDetail, CaseCreate, CaseEdit } from './engagementRouteComponents';

// Lazy load event pages

// Lazy load task pages

// Lazy load case pages

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
