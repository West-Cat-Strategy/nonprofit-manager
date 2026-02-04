/**
 * Analytics Routes
 * Handles analytics, reports, and custom dashboards
 */

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { Route, Navigate } from 'react-router-dom';

// Lazy load analytics pages
const Analytics = lazy(() => import('../pages/analytics/Analytics'));
const CustomDashboard = lazy(() => import('../pages/analytics/CustomDashboard'));
const ReportBuilder = lazy(() => import('../pages/analytics/ReportBuilder'));
const SavedReports = lazy(() => import('../pages/analytics/SavedReports'));

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
        path="/reports"
        element={<ProtectedRoute><Navigate to="/reports/builder" replace /></ProtectedRoute>}
      />
    </>
  );
}

// Re-export lazy components for backwards compatibility
export {
  Analytics,
  CustomDashboard,
  ReportBuilder,
  SavedReports,
};
