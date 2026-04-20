/* eslint-disable react-refresh/only-export-components */

import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { getReportAccess } from '../../auth/state/reportAccess';
import {
  OutcomesReportRoutePage,
  ReportBuilderRoutePage,
  ReportsHomeRoutePage,
  ReportTemplatesRoutePage,
  SavedReportsRoutePage,
  ScheduledReportsRoutePage,
  WorkflowCoverageRoutePage,
} from './reportRouteComponents';

interface RouteWrapperProps {
  children: ReactNode;
}

const getReadOnlyReportsPath = (
  access: ReturnType<typeof getReportAccess>
): string => {
  if (access.canViewReports || access.canManageReports) {
    return '/reports/saved';
  }

  if (access.canViewScheduledReports || access.canManageScheduledReports) {
    return '/reports/scheduled';
  }

  return '/dashboard';
};

function ReportsLandingPageRoute() {
  const user = useAppSelector((state) => state.auth.user);
  const access = getReportAccess(user);

  if (
    access.canManageReports ||
    access.canViewReports ||
    access.canManageScheduledReports ||
    access.canViewScheduledReports
  ) {
    return <ReportsHomeRoutePage />;
  }

  return <Navigate to="/dashboard" replace />;
}

function ReportManagementRoute({ children }: RouteWrapperProps) {
  const user = useAppSelector((state) => state.auth.user);
  const access = getReportAccess(user);

  if (access.canManageReports) {
    return <>{children}</>;
  }

  return <Navigate to={getReadOnlyReportsPath(access)} replace />;
}

function ReportViewRoute({ children }: RouteWrapperProps) {
  const user = useAppSelector((state) => state.auth.user);
  const access = getReportAccess(user);

  if (access.canViewReports || access.canManageReports) {
    return <>{children}</>;
  }

  return <Navigate to={getReadOnlyReportsPath(access)} replace />;
}

function ScheduledReportViewRoute({ children }: RouteWrapperProps) {
  const user = useAppSelector((state) => state.auth.user);
  const access = getReportAccess(user);

  if (access.canViewScheduledReports || access.canManageScheduledReports) {
    return <>{children}</>;
  }

  return <Navigate to={getReadOnlyReportsPath(access)} replace />;
}

export function createReportRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/reports/builder"
        element={
          <ProtectedRoute>
            <ReportManagementRoute>
              <ReportBuilderRoutePage />
            </ReportManagementRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/templates"
        element={
          <ProtectedRoute>
            <ReportManagementRoute>
              <ReportTemplatesRoutePage />
            </ReportManagementRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/saved"
        element={
          <ProtectedRoute>
            <ReportViewRoute>
              <SavedReportsRoutePage />
            </ReportViewRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/scheduled"
        element={
          <ProtectedRoute>
            <ScheduledReportViewRoute>
              <ScheduledReportsRoutePage />
            </ScheduledReportViewRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/outcomes"
        element={
          <ProtectedRoute>
            <ReportViewRoute>
              <OutcomesReportRoutePage />
            </ReportViewRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/workflow-coverage"
        element={
          <ProtectedRoute>
            <ReportViewRoute>
              <WorkflowCoverageRoutePage />
            </ReportViewRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsLandingPageRoute />
          </ProtectedRoute>
        }
      />
    </>
  );
}
