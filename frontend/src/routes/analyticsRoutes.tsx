/**
 * Analytics Routes
 * Handles analytics, reports, and custom dashboards
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { Analytics } from '../features/analytics/routeComponents';
import { AlertHistory, AlertInstances, AlertsOverview } from '../features/alerts/routeComponents';
import { CustomDashboard } from '../features/dashboard/routeComponents';
import { createReportRoutes } from '../features/reports/routes/createReportRoutes';

// Lazy load analytics pages

interface RouteWrapperProps {
  children: ReactNode;
}

export function createAnalyticsRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/analytics"
        element={<ProtectedRoute><Analytics /></ProtectedRoute>}
      />
      <Route
        path="/dashboard/custom"
        element={<ProtectedRoute><CustomDashboard /></ProtectedRoute>}
      />
      <Route
        path="/alerts"
        element={<ProtectedRoute><AlertsOverview /></ProtectedRoute>}
      />
      <Route
        path="/alerts/instances"
        element={<ProtectedRoute><AlertInstances /></ProtectedRoute>}
      />
      <Route
        path="/alerts/history"
        element={<ProtectedRoute><AlertHistory /></ProtectedRoute>}
      />
      {createReportRoutes(ProtectedRoute)}
    </>
  );
}
