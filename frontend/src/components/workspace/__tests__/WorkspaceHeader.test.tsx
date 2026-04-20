import { screen, within } from '@testing-library/react';
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
  it('renders route context, local staff navigation, primary action, and pinned shortcuts', () => {
    renderWithProviders(<WorkspaceHeader />, { route: '/dashboard' });

    const browseWorkspaceNavs = screen.getAllByRole('navigation', {
      name: /browse workspace/i,
    });

    expect(screen.getAllByText('Workbench').length).toBeGreaterThan(0);
    expect(browseWorkspaceNavs.length).toBeGreaterThan(0);
    browseWorkspaceNavs.forEach((navigation) => {
      expect(within(navigation).getByRole('link', { name: /home/i })).toHaveAttribute(
        'href',
        '/dashboard'
      );
    });
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

  it('shows people-area local navigation on staff detail routes', () => {
    renderWithProviders(<WorkspaceHeader />, {
      route: '/contacts/11111111-1111-4111-8111-111111111111',
    });

    const browseWorkspaceNavs = screen.getAllByRole('navigation', {
      name: /browse workspace/i,
    });

    expect(browseWorkspaceNavs.length).toBeGreaterThan(0);
    browseWorkspaceNavs.forEach((navigation) => {
      expect(within(navigation).getByRole('link', { name: /accounts/i })).toHaveAttribute(
        'href',
        '/accounts'
      );
      expect(within(navigation).getByRole('link', { name: /volunteers/i })).toHaveAttribute(
        'href',
        '/volunteers'
      );
    });
    expect(screen.getAllByText(/person detail/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /manage navigation/i })[0]).toHaveAttribute(
      'href',
      '/settings/navigation'
    );
  });
});
