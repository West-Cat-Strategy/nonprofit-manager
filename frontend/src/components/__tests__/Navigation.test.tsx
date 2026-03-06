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
      enabled: true,
      pinned: true,
      isCore: false,
      shortLabel: 'Cases',
      ariaLabel: 'Cases',
    },
  ],
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

  it('renders pinned items and exposes unpin action', async () => {
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

    expect(await screen.findByTestId('desktop-pinned-nav')).toBeInTheDocument();
    const unpinButton = screen.getByRole('button', { name: /unpin cases/i });
    fireEvent.click(unpinButton);
    expect(mockTogglePinned).toHaveBeenCalledWith('cases');
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
    expect(screen.getByRole('dialog', { name: /search people/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close search dialog/i }));
    await waitFor(() => {
      expect(searchButton).toHaveFocus();
    });
  });

  it('renders catalog-driven utility links including alerts', async () => {
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

    const alertLinks = await screen.findAllByRole('link', { name: /alerts/i });
    expect(alertLinks.some((link) => link.getAttribute('href') === '/alerts')).toBe(true);
  });
});
