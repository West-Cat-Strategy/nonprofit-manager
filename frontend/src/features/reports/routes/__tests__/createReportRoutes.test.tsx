import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createReportRoutes } from '../createReportRoutes';
import { renderWithProviders } from '../../../../test/testUtils';

const buildAuthState = (permissions: string[]) => ({
  auth: {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Report',
      lastName: 'User',
      role: 'staff',
      permissions,
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
});

vi.mock('../reportRouteComponents', () => ({
  ReportBuilderRoutePage: () => <div>builder-route</div>,
  ReportTemplatesRoutePage: () => <div>templates-route</div>,
  SavedReportsRoutePage: () => <div>saved-route</div>,
  ScheduledReportsRoutePage: () => <div>scheduled-route</div>,
  OutcomesReportRoutePage: () => <div>outcomes-route</div>,
  WorkflowCoverageRoutePage: () => <div>workflow-route</div>,
}));

const ProtectedRoute = ({ children }: { children: ReactNode }) => <>{children}</>;

describe('createReportRoutes', () => {
  it('sends report managers to the builder from /reports', () => {
    renderWithProviders(
      <Routes>
        {createReportRoutes(ProtectedRoute)}
        <Route path="/dashboard" element={<div>dashboard-route</div>} />
      </Routes>,
      {
        route: '/reports',
        preloadedState: buildAuthState(['report:view', 'report:create']),
      }
    );

    expect(screen.getByText('builder-route')).toBeInTheDocument();
  });

  it('sends read-only report viewers to saved reports from /reports', () => {
    renderWithProviders(
      <Routes>
        {createReportRoutes(ProtectedRoute)}
        <Route path="/dashboard" element={<div>dashboard-route</div>} />
      </Routes>,
      {
        route: '/reports',
        preloadedState: buildAuthState(['report:view', 'scheduled_report:view']),
      }
    );

    expect(screen.getByText('saved-route')).toBeInTheDocument();
  });

  it('redirects non-managers away from the builder route', () => {
    renderWithProviders(
      <Routes>
        {createReportRoutes(ProtectedRoute)}
        <Route path="/dashboard" element={<div>dashboard-route</div>} />
      </Routes>,
      {
        route: '/reports/builder',
        preloadedState: buildAuthState(['report:view', 'scheduled_report:view']),
      }
    );

    expect(screen.getByText('saved-route')).toBeInTheDocument();
  });

  it('redirects non-managers away from the templates route', () => {
    renderWithProviders(
      <Routes>
        {createReportRoutes(ProtectedRoute)}
        <Route path="/dashboard" element={<div>dashboard-route</div>} />
      </Routes>,
      {
        route: '/reports/templates',
        preloadedState: buildAuthState(['report:view', 'scheduled_report:view']),
      }
    );

    expect(screen.getByText('saved-route')).toBeInTheDocument();
  });

  it('falls back to scheduled reports when a user only has scheduled-report view access', () => {
    renderWithProviders(
      <Routes>
        {createReportRoutes(ProtectedRoute)}
        <Route path="/dashboard" element={<div>dashboard-route</div>} />
      </Routes>,
      {
        route: '/reports',
        preloadedState: buildAuthState(['scheduled_report:view']),
      }
    );

    expect(screen.getByText('scheduled-route')).toBeInTheDocument();
  });
});
