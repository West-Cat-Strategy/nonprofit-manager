/**
 * Analytics Routes
 * Handles analytics, reports, and custom dashboards
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import {
  AlertHistory,
  AlertInstances,
  AlertsOverview,
  Analytics,
  CustomDashboard,
} from './analyticsRouteComponents';
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
