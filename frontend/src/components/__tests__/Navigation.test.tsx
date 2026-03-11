import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Navigation from '../Navigation';
import { renderWithProviders } from '../../test/testUtils';

const mockTogglePinned = vi.fn();

const mockNavigationPreferences = {
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
  primaryItems: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      area: 'Home',
      section: 'Core',
      navKind: 'hub',
      parentId: undefined,
      breadcrumbLabel: 'Dashboard',
      enabled: true,
      isCore: true,
      shortLabel: 'Home',
      ariaLabel: 'Go to dashboard',
    },
  ],
  secondaryItems: [
    {
      id: 'contacts',
      name: 'People',
      path: '/contacts',
      icon: '👤',
      area: 'People',
      section: 'People',
      navKind: 'hub',
      parentId: undefined,
      breadcrumbLabel: 'People',
      enabled: true,
      isCore: false,
      shortLabel: 'People',
      ariaLabel: 'Go to contacts',
    },
  ],
  enabledItems: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      area: 'Home',
      section: 'Core',
      navKind: 'hub',
      parentId: undefined,
      breadcrumbLabel: 'Dashboard',
      enabled: true,
      isCore: true,
      shortLabel: 'Home',
      ariaLabel: 'Go to dashboard',
    },
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
  enabledRouteIds: ['dashboard', 'cases', 'contacts'],
  togglePinned: mockTogglePinned,
  isLoading: false,
  isSynced: true,
  isSaving: false,
  syncStatus: 'synced' as const,
  maxPinnedItems: 3,
};

vi.mock('../../hooks/useNavigationPreferences', () => ({
  useNavigationPreferences: () => mockNavigationPreferences,
}));

vi.mock('../../contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      appName: 'Nonprofit Manager',
      appIcon: null,
      favicon: null,
      logoUrl: null,
      colorScheme: 'default',
      customColors: {},
    },
  }),
}));

vi.mock('../dashboard', () => ({
  useQuickLookup: () => ({
    searchTerm: '',
    results: [],
    isLoading: false,
    clearSearch: vi.fn(),
    handleSearchChange: vi.fn(),
  }),
}));

describe('Navigation', () => {
  beforeEach(() => {
    mockTogglePinned.mockClear();
  });

  it('renders preference-driven primary navigation and the desktop search trigger', async () => {
    renderWithProviders(<Navigation />, {
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
    });

    expect(screen.getByRole('navigation', { name: /global navigation/i })).toHaveClass(
      'bg-[var(--app-shell-surface)]'
    );
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: /^people$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /more navigation/i }));
    expect(await screen.findByRole('menuitem', { name: /^people$/i })).toHaveAttribute(
      'href',
      '/contacts'
    );
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });

  it('shows admin quick actions for admins and hides for non-admins', async () => {
    const { unmount } = renderWithProviders(<Navigation />, {
      route: '/dashboard',
      preloadedState: {
        auth: {
          user: {
            id: 'admin-1',
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
    });

    expect(await screen.findByRole('button', { name: /admin quick actions/i })).toBeInTheDocument();
    unmount();

    renderWithProviders(<Navigation />, {
      route: '/dashboard',
      preloadedState: {
        auth: {
          user: {
            id: 'manager-1',
            email: 'manager@example.com',
            firstName: 'Manager',
            lastName: 'User',
            role: 'manager',
          },
          isAuthenticated: true,
          authLoading: false,
          loading: false,
        },
      },
    });

    expect(screen.queryByRole('button', { name: /admin quick actions/i })).not.toBeInTheDocument();
  });

  it('uses the canonical dashboard route for generic admin settings links', async () => {
    renderWithProviders(<Navigation />, {
      route: '/dashboard',
      preloadedState: {
        auth: {
          user: {
            id: 'admin-1',
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
    });

    const userMenuButton = await screen.findByRole('button', { name: /user menu/i });
    fireEvent.click(userMenuButton);

    expect(screen.getByRole('menuitem', { name: /admin settings/i })).toHaveAttribute(
      'href',
      '/settings/admin/dashboard'
    );
  });

  it('maintains user menu aria-expanded and closes on escape', async () => {
    renderWithProviders(<Navigation />, {
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
    });

    const userMenuButton = await screen.findByRole('button', { name: /user menu/i });
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(userMenuButton);
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('returns focus to search button after closing search dialog', async () => {
    renderWithProviders(<Navigation />, {
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
    });

    const searchButton = await screen.findByRole('button', { name: /^search$/i });
    fireEvent.click(searchButton);
    expect(await screen.findByRole('dialog', { name: /search people/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close search dialog/i }));
    await waitFor(() => {
      expect(searchButton).toHaveFocus();
    });
  });

  it('keeps alerts direct and groups utility links under the utilities menu', async () => {
    renderWithProviders(<Navigation />, {
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
    });

    expect(await screen.findByRole('link', { name: /^alerts$/i })).toHaveAttribute(
      'href',
      '/alerts'
    );

    fireEvent.click(screen.getByRole('button', { name: /^utilities$/i }));

    expect(await screen.findByRole('menuitem', { name: /^analytics$/i })).toHaveAttribute(
      'href',
      '/analytics'
    );
    expect(screen.getByRole('menuitem', { name: /^reports$/i })).toHaveAttribute(
      'href',
      '/reports/builder'
    );
  });
});
