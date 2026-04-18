import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { GrantsPage } from '../features/grants/routeComponents';

interface RouteWrapperProps {
  children: ReactNode;
}

export function createGrantsRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/grants"
        element={
          <ProtectedRoute>
            <Navigate to="/grants/funders" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/funders"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/programs"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/recipients"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/funded-programs"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/applications"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/awards"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/disbursements"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/reports"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/documents"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/calendar"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grants/activities"
        element={
          <ProtectedRoute>
            <GrantsPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
