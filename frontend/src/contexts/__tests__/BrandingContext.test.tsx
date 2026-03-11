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

  it('refetches saved branding after auth initializes instead of reusing cached defaults', async () => {
    setBrandingCached(defaultBranding);
    vi.mocked(api.get).mockResolvedValueOnce({ data: savedBranding });

    const store = createTestStore({
      auth: {
        user: null,
        isAuthenticated: false,
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

    act(() => {
      store.dispatch(setCredentials({ user: bootstrapUser }));
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/branding');
    });
    await waitFor(() => {
      expect(screen.getByTestId('app-name')).toHaveTextContent(savedBranding.appName);
    });
  });
});
