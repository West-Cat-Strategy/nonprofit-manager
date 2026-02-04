/**
 * Workflow Routes
 * Handles intake and interaction workflows
 */

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load workflow pages
const IntakeNew = lazy(() => import('../pages/workflows/IntakeNew'));
const InteractionNote = lazy(() => import('../pages/workflows/InteractionNote'));

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

// Re-export lazy components for backwards compatibility
export {
  IntakeNew,
  InteractionNote,
};
