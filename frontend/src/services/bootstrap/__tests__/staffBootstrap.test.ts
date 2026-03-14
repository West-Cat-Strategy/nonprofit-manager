import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../api';
import {
  __resetBrandingCacheForTests,
  getBrandingCachedSync,
} from '../../brandingService';
import {
  clearStaffBootstrapSnapshot,
  getStaffBootstrapSnapshot,
} from '../staffBootstrap';
import {
  __resetUserPreferencesCacheForTests,
  getUserPreferencesCachedSync,
} from '../../userPreferencesService';

describe('staffBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    clearStaffBootstrapSnapshot();
    __resetBrandingCacheForTests();
    __resetUserPreferencesCacheForTests();
  });

  it('captures bootstrap state from /auth/bootstrap and seeds startup caches', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: 'user-1',
            email: 'bootstrap@example.com',
            firstName: 'Bootstrap',
            lastName: 'User',
            role: 'admin',
            profilePicture: null,
            organizationId: 'org-1',
          },
          organizationId: 'org-1',
          branding: {
            appName: 'West Cat',
            appIcon: null,
            primaryColour: '#123456',
            secondaryColour: '#654321',
            favicon: null,
          },
          preferences: {
            timezone: 'America/Vancouver',
            navigation: {
              items: [{ id: 'dashboard' }],
            },
            dashboard_settings: {
              showQuickLookup: false,
            },
            notifications: {
              weeklyDigest: true,
            },
          },
        },
      },
    });

    const snapshot = await getStaffBootstrapSnapshot({ forceRefresh: true });

    expect(api.get).toHaveBeenCalledWith('/auth/bootstrap');
    expect(snapshot).toMatchObject({
      status: 'authenticated',
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'bootstrap@example.com',
      },
      branding: {
        appName: 'West Cat',
      },
      preferences: {
        timezone: 'America/Vancouver',
        navigation: {
          items: [{ id: 'dashboard' }],
        },
        dashboard_settings: {
          showQuickLookup: false,
        },
      },
    });

    expect(getBrandingCachedSync()).toMatchObject({
      appName: 'West Cat',
    });
    expect(getUserPreferencesCachedSync()).toMatchObject({
      timezone: 'America/Vancouver',
      navigation: {
        items: [{ id: 'dashboard' }],
      },
      dashboard_settings: {
        showQuickLookup: false,
      },
    });
    expect(window.localStorage.getItem('navigation_preferences')).toBe(
      JSON.stringify({ items: [{ id: 'dashboard' }] })
    );
    expect(window.localStorage.getItem('dashboardSettings')).toBe(
      JSON.stringify({ showQuickLookup: false })
    );
  });

  it('retries bootstrap once before falling back to the authenticated user snapshot', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('bootstrap not ready'))
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: {
              id: 'user-2',
              email: 'retry@example.com',
              firstName: 'Retry',
              lastName: 'User',
              role: 'admin',
              profilePicture: null,
              organizationId: 'org-2',
            },
            organizationId: 'org-2',
            branding: {
              appName: 'Retry Org',
              appIcon: null,
              primaryColour: '#abcdef',
              secondaryColour: '#fedcba',
              favicon: null,
            },
            preferences: {
              timezone: 'America/Edmonton',
              navigation: {
                items: [{ id: 'contacts' }],
              },
              dashboard_settings: {
                showQuickLookup: true,
              },
            },
          },
        },
      });

    const snapshot = await getStaffBootstrapSnapshot({
      forceRefresh: true,
      fallbackUser: {
        id: 'fallback-user',
        email: 'fallback@example.com',
        firstName: 'Fallback',
        lastName: 'User',
        role: 'admin',
        profilePicture: null,
      },
      fallbackOrganizationId: 'fallback-org',
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(snapshot).toMatchObject({
      status: 'authenticated',
      organizationId: 'org-2',
      user: {
        id: 'user-2',
      },
      preferences: {
        timezone: 'America/Edmonton',
        navigation: {
          items: [{ id: 'contacts' }],
        },
        dashboard_settings: {
          showQuickLookup: true,
        },
      },
    });
    expect(getUserPreferencesCachedSync()).toMatchObject({
      timezone: 'America/Edmonton',
      navigation: {
        items: [{ id: 'contacts' }],
      },
      dashboard_settings: {
        showQuickLookup: true,
      },
    });
  });

  it('seeds an empty preferences cache when fallback auth snapshot has no startup preferences', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('still anonymous'));

    const snapshot = await getStaffBootstrapSnapshot({
      forceRefresh: true,
      fallbackUser: {
        id: 'fallback-user',
        email: 'fallback@example.com',
        firstName: 'Fallback',
        lastName: 'User',
        role: 'admin',
        profilePicture: null,
      },
      fallbackOrganizationId: 'fallback-org',
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(snapshot).toMatchObject({
      status: 'authenticated',
      organizationId: 'fallback-org',
      user: {
        id: 'fallback-user',
      },
      preferences: {},
    });
    expect(getUserPreferencesCachedSync()).toEqual({});
  });
});
