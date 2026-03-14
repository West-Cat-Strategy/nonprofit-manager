import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AuthenticatedShellRoute from '../AuthenticatedShellRoute';
import { renderWithProviders } from '../../../test/testUtils';

vi.mock('../../Layout', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="authenticated-layout">{children}</div>
  ),
}));

describe('AuthenticatedShellRoute', () => {
  it('renders the authenticated shell without waiting for a second bootstrap preload', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedShellRoute />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      {
        route: '/dashboard',
        preloadedState: {
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
        },
      }
    );

    expect(screen.getByTestId('authenticated-layout')).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
