import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rootReducer } from '../../../../store';
import useStaffNavigationViewModel from '../useStaffNavigationViewModel';

vi.mock('../../../../hooks/useNavigationPreferences', () => ({
  useNavigationPreferences: () => ({
    enabledItems: [
      { id: 'dashboard', group: 'primary', path: '/dashboard' },
      { id: 'contacts', group: 'secondary', path: '/contacts' },
      { id: 'websites', group: 'secondary', path: '/websites' },
    ],
    secondaryItems: [
      { id: 'contacts', group: 'secondary', path: '/contacts' },
      { id: 'websites', group: 'secondary', path: '/websites' },
    ],
    favoriteItems: [],
  }) as any,
}));

vi.mock('../../../workspaceModules/useWorkspaceModuleAccess', () => ({
  useWorkspaceModuleAccess: () => ({} as any),
}));

vi.mock('../../../../contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      appName: 'Nonprofit Manager',
      appIcon: null,
    },
  }) as any,
}));

vi.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    availableThemes: ['neobrutalist', 'clean-modern'],
    isDarkMode: false,
    setTheme: vi.fn(),
    theme: 'neobrutalist',
    toggleDarkMode: vi.fn(),
  }) as any,
}));

vi.mock('../../../auth/state/adminAccess', () => ({
  canAccessAdminSettings: () => true,
}));

const renderStaffNavigationHook = (route: string) => {
  const store = configureStore({
    reducer: rootReducer,
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

  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );

  return renderHook(() => useStaffNavigationViewModel(), { wrapper });
};

describe('useStaffNavigationViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps Websites active on console subroutes without hanging the route walk', async () => {
    const { result } = renderStaffNavigationHook('/websites/example-site/overview');

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeRouteIds.has('website-console-overview')).toBe(true);
    expect(result.current.activeRouteIds.has('websites')).toBe(true);
    expect(result.current.currentRouteTitle).toBe('Website Overview');
    expect(result.current.isNavItemActive('websites', '/websites')).toBe(true);
  });
});
