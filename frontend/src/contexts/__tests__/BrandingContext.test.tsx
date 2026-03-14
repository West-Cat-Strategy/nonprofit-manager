import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandingProvider, useBranding } from '../BrandingContext';
import { createTestStore } from '../../test/testUtils';
import { setCredentials } from '../../features/auth/state';
import { defaultBranding } from '../../types/branding';
import {
  __resetBrandingCacheForTests,
  setBrandingCached,
} from '../../services/brandingService';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../services/api';

const bootstrapUser = {
  id: 'user-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

const savedBranding = {
  appName: 'West Cat',
  appIcon: null,
  primaryColour: '#123456',
  secondaryColour: '#654321',
  favicon: null,
};

const BrandingProbe = () => {
  const { branding } = useBranding();
  return <div data-testid="app-name">{branding.appName}</div>;
};

describe('BrandingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetBrandingCacheForTests();
    document.documentElement.style.removeProperty('--brand-primary');
    document.documentElement.style.removeProperty('--brand-secondary');
  });

  it('uses seeded bootstrap branding after auth initializes without refetching', async () => {
    setBrandingCached(savedBranding);

    const store = createTestStore({
      auth: {
        user: null,
        isAuthenticated: false,
        authLoading: true,
        loading: false,
      },
    });

    render(
      <Provider store={store}>
        <BrandingProvider>
          <BrandingProbe />
        </BrandingProvider>
      </Provider>
    );

    expect(screen.getByTestId('app-name')).toHaveTextContent(defaultBranding.appName);
    expect(api.get).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(setCredentials({ user: bootstrapUser }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('app-name')).toHaveTextContent(savedBranding.appName);
    });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('keeps default branding when auth is initialized without a seeded branding fetch', async () => {
    const store = createTestStore({
      auth: {
        user: bootstrapUser,
        isAuthenticated: true,
        authLoading: false,
        loading: false,
      },
    });

    render(
      <Provider store={store}>
        <BrandingProvider>
          <BrandingProbe />
        </BrandingProvider>
      </Provider>
    );

    expect(screen.getByTestId('app-name')).toHaveTextContent(defaultBranding.appName);
    expect(api.get).not.toHaveBeenCalled();
  });
});
