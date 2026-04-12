import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/testUtils';
import {
  clearWorkspaceModuleAccessCache,
  setWorkspaceModuleAccessCached,
} from '../../../services/workspaceModuleAccessService';
import { ProtectedRoute } from '../ProtectedRoute';

const authenticatedState = {
  auth: {
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
};

describe('ProtectedRoute workspace module gating', () => {
<<<<<<< HEAD
  it('waits for auth bootstrap on a protected print route before redirecting', () => {
    clearWorkspaceModuleAccessCache();

    renderWithProviders(
      <Routes>
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div>Print content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      {
        route: '/contacts/123/print',
        preloadedState: {
          auth: {
            user: null,
            isAuthenticated: false,
            authLoading: true,
            loading: false,
          },
        },
      }
    );

    expect(screen.getByText(/loading page/i)).toBeInTheDocument();
    expect(screen.queryByText('Print content')).not.toBeInTheDocument();
  });

=======
>>>>>>> origin/main
  it.each([
    ['/contacts', 'contacts'],
    ['/cases', 'cases'],
    ['/donations', 'donations'],
    ['/reports/scheduled', 'scheduledReports'],
    ['/websites', 'websites'],
  ] as const)('blocks %s when %s is disabled', (path, moduleKey) => {
    clearWorkspaceModuleAccessCache();
    setWorkspaceModuleAccessCached({
      [moduleKey]: false,
    });

    renderWithProviders(
      <Routes>
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div>Module content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      {
        route: path,
        preloadedState: authenticatedState,
      }
    );

    expect(screen.getByText(/module unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Module content')).not.toBeInTheDocument();
  });
});
