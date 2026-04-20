import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import Navigation from '../Navigation';
import { renderWithProviders } from '../../test/testUtils';
import { THEME_IDS } from '../../theme/themeRegistry';

const {
  handleLogoutMock,
  preloadContactsPeopleRouteMock,
  preloadQuickLookupDialogMock,
  setThemeMock,
  toggleDarkModeMock,
  viewModelRef,
} = vi.hoisted(() => ({
  handleLogoutMock: vi.fn(),
  preloadContactsPeopleRouteMock: vi.fn(() => Promise.resolve([])),
  preloadQuickLookupDialogMock: vi.fn(),
  setThemeMock: vi.fn(),
  toggleDarkModeMock: vi.fn(),
  viewModelRef: { current: null } as NavigationViewModelRef,
}));

const primaryItems = [
  {
    id: 'dashboard',
    name: 'Workbench',
    path: '/dashboard',
    shortLabel: 'Workbench',
  },
  {
    id: 'contacts',
    name: 'People',
    path: '/contacts',
    shortLabel: 'People',
  },
  {
    id: 'events',
    name: 'Events',
    path: '/events',
    shortLabel: 'Events',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    path: '/tasks',
    shortLabel: 'Tasks',
  },
];

const secondaryItems = [
  {
    id: 'websites',
    name: 'Websites',
    path: '/websites',
    icon: '🌐',
    shortLabel: 'Websites',
  },
  {
    id: 'donations',
    name: 'Donations',
    path: '/donations',
    icon: '💰',
    shortLabel: 'Donations',
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
    id: 'reports',
    path: '/reports',
    label: 'Reports',
    shortLabel: 'Reports',
    icon: '📄',
    ariaLabel: 'Reports',
  },
];

vi.mock('../../features/navigation/components/StaffNavigationQuickLookupDialog', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Search people">
      <button type="button" onClick={onClose} aria-label="Close search dialog">
        Close
      </button>
    </div>
  ),
}));

vi.mock('../../features/navigation/hooks/useStaffNavigationViewModel', () => ({
  default: () => viewModelRef.current,
}));

const buildViewModel = (overrides: Record<string, unknown> = {}) => ({
  adminQuickActions: [
    {
      id: 'admin-hub',
      label: 'Admin Hub',
      description: 'Open the hybrid admin settings command center',
      to: '/settings/admin/dashboard',
      icon: '🏛️',
    },
  ],
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
  currentLocation: (overrides.currentLocation as string) || '/dashboard',
  currentRouteTitle: 'Workbench',
  handleLogout: handleLogoutMock,
  isNavItemActive: (id: string, path: string) => {
    const activeLocation = (overrides.currentLocation as string) || '/dashboard';
    return (
      path === activeLocation ||
      (activeLocation === '/dashboard' && path === '/alerts') ||
      (activeLocation === '/dashboard' && id === 'dashboard')
    );
  },
  desktopPrimaryItems: primaryItems.slice(0, 3),
  desktopOverflowItems: [primaryItems[3], ...secondaryItems],
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
  prefetchPeopleRoute: preloadContactsPeopleRouteMock,
  prefetchQuickLookupDialog: preloadQuickLookupDialogMock,
  themeState: {
    availableThemes: THEME_IDS,
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

  it('renders the compact primary navigation and desktop overflow grouping', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    expect(screen.getByRole('navigation', { name: /global navigation/i })).toHaveClass(
      'app-shell-surface-opaque'
    );
    expect(screen.getByRole('link', { name: /^workbench$/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /^people$/i })).toHaveAttribute('href', '/contacts');
    expect(screen.getByRole('link', { name: /^events$/i })).toHaveAttribute('href', '/events');

    const primaryNav = screen.getByRole('navigation', { name: /primary navigation/i });
    expect(within(primaryNav).getAllByRole('link')).toHaveLength(3);

    expect(screen.queryByRole('button', { name: /^utilities$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /theme settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /admin quick actions/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more navigation/i }));
    expect(screen.getByRole('link', { name: /^tasks$/i })).toHaveAttribute('href', '/tasks');
    expect(screen.getByRole('link', { name: /^websites$/i })).toHaveAttribute('href', '/websites');
    expect(screen.getByRole('link', { name: /^analytics$/i })).toHaveAttribute(
      'href',
      '/analytics'
    );
    expect(screen.getByRole('link', { name: /^reports$/i })).toHaveAttribute(
      'href',
      '/reports'
    );

    expect(screen.getByRole('link', { name: /^alerts$/i })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: /^alerts$/i })).toHaveClass(
      'app-accent-contrast-ink'
    );
    expect(preloadContactsPeopleRouteMock).not.toHaveBeenCalled();
    expect(preloadQuickLookupDialogMock).not.toHaveBeenCalled();
  });

  it('prefetches the People route only when the user shows intent on the navigation item', () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const peopleLink = screen.getByRole('link', { name: /^people$/i });
    expect(preloadContactsPeopleRouteMock).not.toHaveBeenCalled();

    fireEvent.mouseEnter(peopleLink);
    fireEvent.focus(peopleLink);

    expect(preloadContactsPeopleRouteMock).toHaveBeenCalledTimes(2);
  });

  it('prefetches the quick lookup dialog only when the search control receives intent', () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    expect(preloadQuickLookupDialogMock).not.toHaveBeenCalled();

    fireEvent.mouseEnter(searchButton);
    fireEvent.focus(searchButton);

    expect(preloadQuickLookupDialogMock).toHaveBeenCalledTimes(2);
  });

  it('renders the branded logo without the accent tile wrapper', () => {
    viewModelRef.current = buildViewModel({
      branding: {
        appName: 'Nonprofit Manager',
        appIcon: '/vite.svg',
      },
    });

    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const logo = screen.getByRole('img', { name: /nonprofit manager/i });
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
    const adminSettingsLinks = screen.getAllByRole('link', { name: /^admin settings$/i });
    expect(adminSettingsLinks).not.toHaveLength(0);
    expect(
      adminSettingsLinks.every((link) => link.getAttribute('href') === '/settings/admin/dashboard')
    ).toBe(true);

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
    expect(screen.queryAllByRole('link', { name: /^admin settings$/i })).toHaveLength(0);
  });

  it('highlights hidden desktop destinations through the More menu', async () => {
    viewModelRef.current = buildViewModel({
      currentLocation: '/tasks',
    });

    renderWithProviders(<Navigation />, { route: '/tasks' });

    const moreButton = screen.getByRole('button', { name: /more navigation/i });
    expect(moreButton).toHaveClass('border-app-accent', 'bg-app-accent');

    fireEvent.click(moreButton);
    expect(screen.getByRole('link', { name: /^tasks$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('closes the More menu from the backdrop and restores focus to its trigger', async () => {
    const { container } = renderWithProviders(<Navigation />, { route: '/dashboard' });

    const moreButton = screen.getByRole('button', { name: /more navigation/i });
    fireEvent.click(moreButton);

    expect(
      await screen.findByRole('navigation', { name: /more navigation/i })
    ).toBeInTheDocument();

    const backdrop = container.querySelector('div[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop as HTMLElement);

    await waitFor(() => {
      expect(
        screen.queryByRole('navigation', { name: /more navigation/i })
      ).not.toBeInTheDocument();
      expect(moreButton).toHaveFocus();
    });
  });

  it('maintains user menu state and delegates logout', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const userMenuButton = await screen.findByRole('button', { name: /user menu/i });
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(userMenuButton);
    expect(userMenuButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(handleLogoutMock).toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('opens and closes the search dialog while restoring focus', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    const searchButton = await screen.findByRole('button', { name: /^search$/i });
    expect(searchButton).not.toHaveFocus();
    fireEvent.click(searchButton);
    expect(await screen.findByRole('dialog', { name: /search people/i })).toBeInTheDocument();
    expect(searchButton).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(screen.getByRole('button', { name: /close search dialog/i }));
    await waitFor(() => {
      expect(searchButton).toHaveFocus();
    });
  });

  it('keeps the quick lookup overlay exclusive by closing the More menu first', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    fireEvent.click(screen.getByRole('button', { name: /more navigation/i }));
    expect(screen.getByRole('navigation', { name: /more navigation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(await screen.findByRole('dialog', { name: /search people/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /more navigation/i })).not.toBeInTheDocument();
  });

  it('opens the mobile drawer as a dialog and focuses its close button', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    fireEvent.click(screen.getByRole('button', { name: /main menu/i }));

    const drawer = await screen.findByRole('dialog', { name: /nonprofit manager/i });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close menu/i })).toHaveFocus();
    });
  });

  it('renders theme controls and admin actions inside the account menu', async () => {
    renderWithProviders(<Navigation />, { route: '/dashboard' });

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));

    const adminSettingsLinks = screen.getAllByRole('link', { name: /^admin settings$/i });
    const themeHeading = screen.getByText(/^theme$/i);
    const userMenuPanel = themeHeading.closest('div[data-shell-transition]');

    expect(adminSettingsLinks).not.toHaveLength(0);
    expect(
      adminSettingsLinks.every((link) => link.getAttribute('href') === '/settings/admin/dashboard')
    ).toBe(true);
    expect(
      Boolean(
        adminSettingsLinks[0].compareDocumentPosition(themeHeading) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
    expect(userMenuPanel?.className).toContain('max-h-[min(28rem,calc(100vh-6rem))]');
    expect(userMenuPanel?.className).toContain('overflow-y-auto');
    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editorial ops/i })).toBeInTheDocument();
    expect(screen.getByText(/warm operational surfaces, serif headlines/i)).toBeInTheDocument();
    expect(
      screen.getByText(/a softer contemporary workspace with calm depth/i)
    ).toBeInTheDocument();
  });
});
