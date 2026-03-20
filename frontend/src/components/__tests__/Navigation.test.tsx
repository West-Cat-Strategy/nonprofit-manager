import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Navigation from '../Navigation';
import { renderWithProviders } from '../../test/testUtils';

const {
  handleLogoutMock,
  setThemeMock,
  toggleDarkModeMock,
  viewModelRef,
} = vi.hoisted(() => ({
  handleLogoutMock: vi.fn(),
  setThemeMock: vi.fn(),
  toggleDarkModeMock: vi.fn(),
  viewModelRef: { current: null } as NavigationViewModelRef,
}));

const primaryItems = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    shortLabel: 'Home',
  },
];

const secondaryItems = [
  {
    id: 'contacts',
    name: 'People',
    path: '/contacts',
    icon: '👤',
    shortLabel: 'People',
  },
];

const utilityNavLinks = [
  {
    id: 'analytics',
    path: '/analytics',
    label: 'Analytics',
    shortLabel: 'Analytics',
    icon: '📈',
    ariaLabel: 'Analytics',
  },
  {
    id: 'reports-builder',
    path: '/reports/builder',
    label: 'Reports',
    shortLabel: 'Reports',
    icon: '📄',
    ariaLabel: 'Reports',
  },
];

vi.mock('../navigation/preloadNavigationQuickLookupDialog', () => ({
  preloadNavigationQuickLookupDialog: () =>
    Promise.resolve({
      default: ({ onClose }: { onClose: () => void }) => (
        <div role="dialog" aria-label="Search people">
          <button type="button" onClick={onClose} aria-label="Close search dialog">
            Close
          </button>
        </div>
      ),
    }),
}));

vi.mock('../../features/contacts/routePreload', () => ({
  preloadContactsPeopleRoute: vi.fn(() => Promise.resolve([])),
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

vi.mock('../../features/navigation/hooks/useStaffNavigationViewModel', () => ({
  default: () => viewModelRef.current,
}));

const buildViewModel = (overrides: Record<string, unknown> = {}) => ({
  adminSettingsPath: '/settings/admin/dashboard',
  alertsLink: {
    id: 'alerts-overview',
    path: '/alerts',
    label: 'Alerts',
    shortLabel: 'Alerts',
    icon: '🚨',
  },
  branding: {
    appName: 'Nonprofit Manager',
    appIcon: null,
  },
  canOpenAdminSettings: true,
  currentLocation: '/dashboard',
  currentRouteTitle: 'Dashboard',
  handleLogout: handleLogoutMock,
  hasActiveSecondaryItem: false,
  hasActiveUtilityItem: false,
  isNavItemActive: (id: string, path: string) =>
    path === '/dashboard' || id === 'dashboard' || path === '/alerts',
  navigationPreferences: {
    favoriteItems: [],
    primaryItems,
    secondaryItems,
  },
  mobileAlertsLink: {
    id: 'alerts-overview',
    path: '/alerts',
    label: 'Alerts',
    shortLabel: 'Alerts',
    icon: '🚨',
  },
  mobileDrawerUtilityLinks: utilityNavLinks,
  mobileNavigationPreferences: {
    primaryItems,
    secondaryItems,
  },
  themeLabels: {
    neobrutalist: 'EO',
    'clean-modern': 'CM',
  },
  themeState: {
    availableThemes: ['neobrutalist', 'clean-modern'],
    isDarkMode: false,
    setTheme: setThemeMock,
    theme: 'neobrutalist',
    toggleDarkMode: toggleDarkModeMock,
  },
  utilityNavLinks,
  user: {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    role: 'admin',
  },
  ...overrides,
});

type NavigationViewModelRef = {
  current: ReturnType<typeof buildViewModel> | null;
};

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewModelRef.current = buildViewModel();
  });

  it('renders the view-model-driven primary navigation and utilities', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    expect(screen.getByRole('navigation', { name: /global navigation/i })).toHaveClass(
      'bg-[var(--app-shell-surface)]'
    );
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: /^people$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more navigation/i }));
    expect(screen.getByRole('menuitem', { name: /^people$/i })).toHaveAttribute(
      'href',
      '/contacts'
    );

    expect(screen.getByRole('link', { name: /^alerts$/i })).toHaveAttribute('href', '/alerts');

    fireEvent.click(screen.getByRole('button', { name: /^utilities$/i }));
    expect(screen.getByRole('menuitem', { name: /^analytics$/i })).toHaveAttribute(
      'href',
      '/analytics'
    );
    expect(screen.getByRole('menuitem', { name: /^reports$/i })).toHaveAttribute(
      'href',
      '/reports/builder'
    );
  });

  it('renders the branded logo without the accent tile wrapper', () => {
    viewModelRef.current = buildViewModel({
      branding: {
        appName: 'Nonprofit Manager',
        appIcon: '/vite.svg',
      },
    });

    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const logo = screen.getByRole('img', { name: /imported/i });
    const logoWrapper = logo.closest('div');

    expect(logoWrapper).toHaveClass('flex', 'h-9', 'w-9', 'overflow-hidden');
    expect(logoWrapper).not.toHaveClass('bg-app-accent', 'text-[var(--app-accent-foreground)]');
    expect(logoWrapper).not.toHaveClass('shadow-sm');
  });

  it('keeps search and alerts in the mobile header instead of the drawer', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^alerts$/i })).toHaveAttribute('href', '/alerts');

    fireEvent.click(screen.getByRole('button', { name: /main menu/i }));

    expect(screen.getByText(/^more modules$/i)).toBeInTheDocument();
    expect(screen.queryByText(/search workspace/i)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^alerts$/i)).toHaveLength(1);
  });

  it('shows admin settings links only when the view model allows them', async () => {
    const { unmount } = renderWithProviders(<Navigation />, { route: '/dashboard' });

    fireEvent.click(await screen.findByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem', { name: /admin settings/i })).toHaveAttribute(
      'href',
      '/settings/admin/dashboard'
    );

    unmount();
    viewModelRef.current = buildViewModel({
      canOpenAdminSettings: false,
      user: {
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@example.com',
        role: 'manager',
      },
    });
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.queryByRole('menuitem', { name: /admin settings/i })).not.toBeInTheDocument();
  });

  it('maintains user menu state and delegates logout', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const userMenuButton = await screen.findByRole('button', { name: /user menu/i });
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(userMenuButton);
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    expect(handleLogoutMock).toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('opens and closes the search dialog while restoring focus', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const searchButton = await screen.findByRole('button', { name: /^search$/i });
    fireEvent.click(searchButton);
    expect(await screen.findByRole('dialog', { name: /search people/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close search dialog/i }));
    await waitFor(() => {
      expect(searchButton).toHaveFocus();
    });
  });

  it('renders compact theme labels and detailed theme menu rows', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const themeButton = screen.getByRole('button', { name: /theme settings/i });
    expect(themeButton).toHaveTextContent('EO');

    fireEvent.click(themeButton);

    expect(screen.getByRole('menuitem', { name: /editorial ops/i })).toBeInTheDocument();
    expect(screen.getByText(/warm operational surfaces, serif headlines/i)).toBeInTheDocument();
    expect(screen.getByText(/a softer contemporary workspace with calm depth/i)).toBeInTheDocument();
  });
});
