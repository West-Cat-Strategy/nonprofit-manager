/**
 * Workflow Routes
 * Handles intake and interaction workflows
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { IntakeNew, InteractionNote } from './workflowRouteComponents';

// Lazy load workflow pages

interface RouteWrapperProps {
  children: ReactNode;
}

export function createWorkflowRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/intake/new"
        element={<ProtectedRoute><IntakeNew /></ProtectedRoute>}
      />
      <Route
        path="/interactions/new"
        element={<ProtectedRoute><InteractionNote /></ProtectedRoute>}
      />
    </>
  );
}
