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

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create intake/i })).toHaveAttribute(
      'href',
      '/intake/new'
    );
    expect(screen.getByRole('link', { name: /pinned shortcut: cases/i })).toHaveAttribute(
      'href',
      '/cases'
    );
  });
});
