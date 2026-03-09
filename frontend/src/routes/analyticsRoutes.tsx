/**
 * Analytics Routes
 * Handles analytics, reports, and custom dashboards
 */

import type { ReactNode } from 'react';
import { Route, Navigate } from 'react-router-dom';
import {
  AlertHistory,
  AlertInstances,
  AlertsOverview,
  Analytics,
  CustomDashboard,
  OutcomesReport,
  ReportBuilder,
  ReportTemplates,
  ScheduledReports,
  SavedReports,
  WorkflowCoverageReport,
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
      <Route
        path="/reports/builder"
        element={<ProtectedRoute><ReportBuilder /></ProtectedRoute>}
      />
      <Route
        path="/reports/templates"
        element={<ProtectedRoute><ReportTemplates /></ProtectedRoute>}
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
        path="/reports/workflow-coverage"
        element={<ProtectedRoute><WorkflowCoverageReport /></ProtectedRoute>}
      />
      <Route
        path="/reports"
        element={<ProtectedRoute><Navigate to="/reports/builder" replace /></ProtectedRoute>}
      />
    </>
  );
}
