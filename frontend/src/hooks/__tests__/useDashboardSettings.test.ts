import { act, renderHook } from '@testing-library/react';
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

const flushDashboardSettings = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useDashboardSettings', () => {
  const nowMs = 1_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
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
            showFocusQueue: false,
          },
        },
      },
    });
    mockedApi.patch.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches authenticated dashboard settings once and reuses the confirmed server snapshot on remount', async () => {
    const firstMount = renderHook(() => useDashboardSettings());
    await flushDashboardSettings();

    expect(firstMount.result.current.isLoading).toBe(false);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(firstMount.result.current.settings.showQuickLookup).toBe(false);
    expect(firstMount.result.current.settings.showFocusQueue).toBe(false);
    firstMount.unmount();

    const secondMount = renderHook(() => useDashboardSettings());
    await flushDashboardSettings();

    expect(secondMount.result.current.isLoading).toBe(false);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(secondMount.result.current.settings.showQuickLookup).toBe(false);
    expect(secondMount.result.current.settings.showFocusQueue).toBe(false);
    secondMount.unmount();
  });

  it('does not PATCH dashboard settings just from hydrating local fallback and server data', async () => {
    localStorage.setItem(
      'dashboardSettings',
      JSON.stringify({
        showQuickLookup: true,
        showFocusQueue: true,
      })
    );

    const mount = renderHook(() => useDashboardSettings());
    await flushDashboardSettings();

    expect(mount.result.current.isLoading).toBe(false);
    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.patch).not.toHaveBeenCalled();
    expect(mount.result.current.settings.showQuickLookup).toBe(false);
    mount.unmount();
  });

  it('uses bootstrap-seeded dashboard settings without issuing a duplicate GET', async () => {
    localStorage.setItem(
      'dashboardSettings',
      JSON.stringify({
        showQuickLookup: true,
      })
    );
    setUserPreferencesCached({
      dashboard_settings: {
        showQuickLookup: false,
      },
    } as never);

    const mount = renderHook(() => useDashboardSettings());
    await flushDashboardSettings();

    expect(mount.result.current.isLoading).toBe(false);
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(mount.result.current.settings.showQuickLookup).toBe(false);
    mount.unmount();
  });

  it('persists user-initiated changes after hydration instead of on initial open', async () => {
    const mount = renderHook(() => useDashboardSettings());
    await flushDashboardSettings();

    expect(mount.result.current.isLoading).toBe(false);
    act(() => {
      mount.result.current.setSettings({
        ...mount.result.current.settings,
        showWorkspaceSummary: false,
      });
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(JSON.parse(localStorage.getItem('dashboardSettings') || '{}')).toMatchObject({
      showWorkspaceSummary: false,
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(mockedApi.patch).toHaveBeenCalledTimes(1);
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/preferences/dashboard_settings', {
      value: expect.objectContaining({
        showWorkspaceSummary: false,
      }),
    });
    mount.unmount();
  });

  it('normalizes legacy insight settings into the new view-settings shape', async () => {
    authState = { isAuthenticated: false };
    localStorage.setItem(
      'dashboardSettings',
      JSON.stringify({
        showQuickLookup: false,
        showEngagementChart: false,
        showVolunteerWidget: false,
      })
    );

    const mount = renderHook(() => useDashboardSettings());
    await flushDashboardSettings();

    expect(mount.result.current.isLoading).toBe(false);
    expect(mount.result.current.settings.showQuickLookup).toBe(false);
    expect(mount.result.current.settings.showInsightStrip).toBe(false);
    expect(mount.result.current.settings.showFocusQueue).toBe(true);
    expect(mockedApi.get).not.toHaveBeenCalled();
    mount.unmount();
  });
});
