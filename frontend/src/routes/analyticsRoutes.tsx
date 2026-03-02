/**
 * Analytics Routes
 * Handles analytics, reports, and custom dashboards
 */

import type { ReactNode } from 'react';
import { Route, Navigate } from 'react-router-dom';
import {
  Analytics,
  CustomDashboard,
  OutcomesReport,
  ReportBuilder,
  ScheduledReports,
  SavedReports,
} from './analyticsRouteComponents';

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
        path="/reports/builder"
        element={<ProtectedRoute><ReportBuilder /></ProtectedRoute>}
      />
      <Route
        path="/reports/saved"
        element={<ProtectedRoute><SavedReports /></ProtectedRoute>}
      />
      <Route
        path="/reports/scheduled"
        element={<ProtectedRoute><ScheduledReports /></ProtectedRoute>}
      />
      <Route
        path="/reports/outcomes"
        element={<ProtectedRoute><OutcomesReport /></ProtectedRoute>}
      />
      <Route
        path="/reports"
        element={<ProtectedRoute><Navigate to="/reports/builder" replace /></ProtectedRoute>}
      />
    </>
  );
}
