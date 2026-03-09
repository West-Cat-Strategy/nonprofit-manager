import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../services/api';
import {
  __resetDashboardSettingsServerCacheForTests,
  useDashboardSettings,
} from '../useDashboardSettings';
import { __resetUserPreferencesCacheForTests } from '../../services/userPreferencesService';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

let authState = { isAuthenticated: true };

vi.mock('../../store/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { isAuthenticated: boolean } }) => unknown) =>
    selector({ auth: authState }),
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

describe('useDashboardSettings cache behavior', () => {
  let nowMs = 1_000_000;

  beforeEach(() => {
    authState = { isAuthenticated: true };
    localStorage.clear();
    __resetDashboardSettingsServerCacheForTests();
    __resetUserPreferencesCacheForTests();
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    mockedApi.get.mockResolvedValue({
      data: {
        preferences: {
          dashboard_settings: {
            showQuickLookup: false,
            kpis: {
              events: false,
            },
          },
        },
      },
    });
    mockedApi.patch.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses cached server settings within ttl and avoids duplicate GET requests', async () => {
    const firstMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(firstMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    firstMount.unmount();

    const secondMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(secondMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(secondMount.result.current.settings.showQuickLookup).toBe(false);
    expect(secondMount.result.current.settings.showWorkspaceSummary).toBe(true);
    expect(secondMount.result.current.settings.showPinnedWorkstreams).toBe(true);
    secondMount.unmount();
  });

  it('fetches fresh server settings after cache ttl expiry', async () => {
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          preferences: {
            dashboard_settings: {
              showQuickLookup: false,
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          preferences: {
            dashboard_settings: {
              showQuickLookup: true,
            },
          },
        },
      });

    const firstMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(firstMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    firstMount.unmount();

    nowMs += 5 * 60 * 1000 + 1;

    const secondMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(secondMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(secondMount.result.current.settings.showQuickLookup).toBe(true);
    secondMount.unmount();
  });
});
