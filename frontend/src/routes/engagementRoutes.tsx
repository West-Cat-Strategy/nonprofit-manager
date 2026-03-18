/**
 * Engagement Routes
 * Handles events, tasks, and cases
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import {
  CaseCreate,
  CaseDetail,
  CaseEdit,
  CaseList,
  EventCalendarPage,
  EventCheckInDesk,
  EventCreate,
  EventDetail,
  EventEdit,
  EventList,
  ExternalServiceProviders,
  FollowUpsPage,
  OpportunitiesPage,
  TaskCreate,
  TaskDetail,
  TaskEdit,
  TaskList,
  TeamChatInboxPage,
} from '../features/engagement/routeComponents';

// Lazy load event pages

// Lazy load task pages

// Lazy load case pages

interface RouteWrapperProps {
  children: ReactNode;
}

export function createEngagementRoutes(
  NeoBrutalistRoute: React.ComponentType<RouteWrapperProps>
) {
  const teamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';

  return (
    <>
      {/* Event Routes */}
      <Route
        path="/events"
        element={<NeoBrutalistRoute><EventList /></NeoBrutalistRoute>}
      />
      <Route
        path="/events/calendar"
        element={<NeoBrutalistRoute><EventCalendarPage /></NeoBrutalistRoute>}
      />
      <Route
        path="/events/check-in"
        element={<NeoBrutalistRoute><EventCheckInDesk /></NeoBrutalistRoute>}
      />
      <Route
        path="/events/new"
        element={<NeoBrutalistRoute><EventCreate /></NeoBrutalistRoute>}
      />
      <Route
        path="/events/:id/edit"
        element={<NeoBrutalistRoute><EventEdit /></NeoBrutalistRoute>}
      />
      <Route
        path="/events/:id"
        element={<NeoBrutalistRoute><EventDetail /></NeoBrutalistRoute>}
      />

      {/* Task Routes */}
      <Route
        path="/tasks"
        element={<NeoBrutalistRoute><TaskList /></NeoBrutalistRoute>}
      />
      <Route
        path="/tasks/new"
        element={<NeoBrutalistRoute><TaskCreate /></NeoBrutalistRoute>}
      />
      <Route
        path="/tasks/:id/edit"
        element={<NeoBrutalistRoute><TaskEdit /></NeoBrutalistRoute>}
      />
      <Route
        path="/tasks/:id"
        element={<NeoBrutalistRoute><TaskDetail /></NeoBrutalistRoute>}
      />

      {/* Case Routes */}
      <Route
        path="/cases"
        element={<NeoBrutalistRoute><CaseList /></NeoBrutalistRoute>}
      />
      <Route
        path="/cases/new"
        element={<NeoBrutalistRoute><CaseCreate /></NeoBrutalistRoute>}
      />
      <Route
        path="/cases/:id/edit"
        element={<NeoBrutalistRoute><CaseEdit /></NeoBrutalistRoute>}
      />
      <Route
        path="/cases/:id"
        element={<NeoBrutalistRoute><CaseDetail /></NeoBrutalistRoute>}
      />
      <Route
        path="/external-service-providers"
        element={<NeoBrutalistRoute><ExternalServiceProviders /></NeoBrutalistRoute>}
      />
      <Route
        path="/follow-ups"
        element={<NeoBrutalistRoute><FollowUpsPage /></NeoBrutalistRoute>}
      />
      <Route
        path="/opportunities"
        element={<NeoBrutalistRoute><OpportunitiesPage /></NeoBrutalistRoute>}
      />
      {teamChatEnabled && (
        <Route
          path="/team-chat"
          element={<NeoBrutalistRoute><TeamChatInboxPage /></NeoBrutalistRoute>}
        />
      )}
    </>
  );
}
