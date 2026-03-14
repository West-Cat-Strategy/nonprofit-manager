import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../services/api';
import {
  __resetDashboardSettingsServerCacheForTests,
  useDashboardSettings,
} from '../useDashboardSettings';
import {
  __resetUserPreferencesCacheForTests,
  setUserPreferencesCached,
} from '../../services/userPreferencesService';

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

  it('uses local defaults on mount without issuing a startup GET request', async () => {
    const firstMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(firstMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).not.toHaveBeenCalled();
    firstMount.unmount();

    const secondMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(secondMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(secondMount.result.current.settings.showQuickLookup).toBe(true);
    expect(secondMount.result.current.settings.showWorkspaceSummary).toBe(true);
    expect(secondMount.result.current.settings.showPinnedWorkstreams).toBe(true);
    secondMount.unmount();
  });

  it('persists locally changed settings across remounts without refetching startup preferences', async () => {
    const firstMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(firstMount.result.current.isLoading).toBe(false));

    act(() => {
      firstMount.result.current.setSettings({
        ...firstMount.result.current.settings,
        showQuickLookup: false,
      });
    });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('dashboardSettings') || '{}')).toMatchObject({
        showQuickLookup: false,
      });
    });
    firstMount.unmount();

    nowMs += 5 * 60 * 1000 + 1;

    const secondMount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(secondMount.result.current.isLoading).toBe(false));
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(secondMount.result.current.settings.showQuickLookup).toBe(false);
    secondMount.unmount();
  });

  it('uses bootstrap-seeded dashboard settings without issuing a duplicate GET', async () => {
    localStorage.setItem(
      'dashboardSettings',
      JSON.stringify({
        showQuickLookup: false,
      })
    );
    setUserPreferencesCached({
      dashboard_settings: {
        showQuickLookup: false,
      },
    } as never);

    const mount = renderHook(() => useDashboardSettings());
    await waitFor(() => expect(mount.result.current.isLoading).toBe(false));

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(mount.result.current.settings.showQuickLookup).toBe(false);
    mount.unmount();
  });
});
