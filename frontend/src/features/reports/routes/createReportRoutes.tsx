import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  OutcomesReportRoutePage,
  ReportBuilderRoutePage,
  ReportTemplatesRoutePage,
  SavedReportsRoutePage,
  ScheduledReportsRoutePage,
  WorkflowCoverageRoutePage,
} from './reportRouteComponents';

interface RouteWrapperProps {
  children: ReactNode;
}

export function createReportRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/reports/builder"
        element={
          <ProtectedRoute>
            <ReportBuilderRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/templates"
        element={
          <ProtectedRoute>
            <ReportTemplatesRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/saved"
        element={
          <ProtectedRoute>
            <SavedReportsRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/scheduled"
        element={
          <ProtectedRoute>
            <ScheduledReportsRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/outcomes"
        element={
          <ProtectedRoute>
            <OutcomesReportRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/workflow-coverage"
        element={
          <ProtectedRoute>
            <WorkflowCoverageRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Navigate to="/reports/builder" replace />
          </ProtectedRoute>
        }
      />
    </>
  );
}
