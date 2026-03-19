import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import WorkspaceHeader from '../WorkspaceHeader';
import { renderWithProviders } from '../../../test/testUtils';

vi.mock('../../../hooks/useNavigationPreferences', () => ({
  useNavigationPreferences: () => ({
    favoriteItems: [
      {
        id: 'cases',
        name: 'Cases',
        path: '/cases',
        icon: '📋',
        area: 'Service',
        section: 'Engagement',
        navKind: 'hub',
        parentId: undefined,
        breadcrumbLabel: 'Cases',
        enabled: true,
        pinned: true,
        isCore: false,
        shortLabel: 'Cases',
        ariaLabel: 'Cases',
      },
    ],
    pinnedItems: [
      {
        id: 'cases',
        name: 'Cases',
        path: '/cases',
        icon: '📋',
        area: 'Service',
        section: 'Engagement',
        navKind: 'hub',
        parentId: undefined,
        breadcrumbLabel: 'Cases',
        enabled: true,
        pinned: true,
        isCore: false,
        shortLabel: 'Cases',
        ariaLabel: 'Cases',
      },
    ],
  }),
}));

describe('WorkspaceHeader', () => {
  it('renders route context, primary action, and pinned shortcuts', () => {
    renderWithProviders(<WorkspaceHeader />, { route: '/dashboard' });

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByText(/pinned shortcuts/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /create intake/i })[0]).toHaveAttribute(
      'href',
      '/intake/new'
    );
    expect(screen.getByRole('link', { name: /pinned shortcut: cases/i })).toHaveAttribute(
      'href',
      '/cases'
    );
  });

  it('hides the browse workspace block on staff detail routes', () => {
    renderWithProviders(<WorkspaceHeader />, {
      route: '/contacts/11111111-1111-4111-8111-111111111111',
    });

    expect(
      screen.queryByRole('navigation', { name: /browse workspace/i })
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/person detail/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /manage navigation/i })[0]).toHaveAttribute(
      'href',
      '/settings/navigation'
    );
  });
});
