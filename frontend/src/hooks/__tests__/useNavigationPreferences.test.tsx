import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../services/api';
import {
  MAX_PINNED_ITEMS,
  __resetNavigationPreferencesCacheForTests,
  useNavigationPreferences,
} from '../useNavigationPreferences';
import * as navigationPreferencesModule from '../useNavigationPreferences';
import {
  __resetUserPreferencesCacheForTests,
  setUserPreferencesCached,
} from '../../services/userPreferencesService';
import {
  clearWorkspaceModuleAccessCache,
  setWorkspaceModuleAccessCached,
} from '../../services/workspaceModuleAccessService';

let authState = { isAuthenticated: true };

vi.mock('../../store/hooks', () => ({
  useAppSelector: (
    selector: (state: { auth: { isAuthenticated: boolean } }) => unknown
  ) => selector({ auth: authState }),
}));

const renderNavigationPreferencesHook = () => renderHook(() => useNavigationPreferences());

const flushNavigationPreferences = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useNavigationPreferences', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authState = { isAuthenticated: true };
    vi.clearAllMocks();
    window.localStorage.clear();
    __resetNavigationPreferencesCacheForTests();
    __resetUserPreferencesCacheForTests();
    clearWorkspaceModuleAccessCache();
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: {} } });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces stale local fallback with fresher server preferences without PATCHing on mount', async () => {
    window.localStorage.setItem(
      'navigation_preferences',
      JSON.stringify({
        items: [
          { id: 'dashboard', enabled: true, pinned: false },
          { id: 'cases', enabled: true, pinned: false },
        ],
      })
    );
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        preferences: {
          navigation: {
            items: [
              { id: 'dashboard', enabled: true, pinned: false },
              { id: 'cases', enabled: false, pinned: false },
            ],
          },
        },
      },
    });

    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.patch)).not.toHaveBeenCalled();
    expect(result.current.allItems.find((item) => item.id === 'cases')?.enabled).toBe(false);
  });

  it('allows pinning up to max and blocks additional pins', async () => {
    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();
    expect(result.current.isLoading).toBe(false);

    const pinnableIds = result.current.allItems.filter((item) => !item.isCore).slice(0, MAX_PINNED_ITEMS + 1);

    for (const item of pinnableIds.slice(0, MAX_PINNED_ITEMS)) {
      act(() => {
        result.current.togglePinned(item.id);
      });
    }

    const pinnedIds = result.current.pinnedItems.map((item) => item.id);
    expect(pinnedIds).toHaveLength(MAX_PINNED_ITEMS);

    act(() => {
      result.current.togglePinned(pinnableIds[MAX_PINNED_ITEMS].id);
    });

    expect(result.current.pinnedItems.map((item) => item.id)).toEqual(pinnedIds);
  });

  it('auto-unpins items when disabled', async () => {
    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.togglePinned('cases');
    });
    expect(result.current.allItems.find((item) => item.id === 'cases')?.pinned).toBe(true);

    act(() => {
      result.current.toggleItem('cases');
    });

    const updated = result.current.allItems.find((item) => item.id === 'cases');
    expect(updated?.enabled).toBe(false);
    expect(updated?.pinned).toBe(false);
    expect(result.current.enabledRouteIds).not.toContain('cases');
    expect(result.current.favoriteItems).toHaveLength(0);
  });

  it('seeds route hierarchy metadata for navigation items', async () => {
    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();
    expect(result.current.isLoading).toBe(false);

    expect(result.current.favoriteItems).toEqual(result.current.pinnedItems);

    const dashboard = result.current.allItems.find((item) => item.id === 'dashboard');
    expect(dashboard).toMatchObject({
      area: 'Home',
      navKind: 'hub',
      breadcrumbLabel: 'Dashboard',
    });

    const contacts = result.current.allItems.find((item) => item.id === 'contacts');
    expect(contacts).toMatchObject({
      area: 'People',
      navKind: 'hub',
      breadcrumbLabel: 'People',
    });

    expect(result.current.enabledRouteIds).toContain('dashboard');
    expect(result.current.enabledRouteIds).toContain('contacts');
  });

  it('exposes saving and synced states only after a user change', async () => {
    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();
    expect(result.current.isLoading).toBe(false);

    expect(result.current.isSaving).toBe(false);
    expect(result.current.syncStatus).toBe('offline');

    act(() => {
      result.current.togglePinned('cases');
    });

    expect(result.current.isSaving).toBe(true);
    expect(result.current.syncStatus).toBe('saving');

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(vi.mocked(api.patch)).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSynced).toBe(true);
    expect(result.current.syncStatus).toBe('synced');
  });

  it('uses bootstrap-seeded navigation preferences without issuing a duplicate GET', async () => {
    window.localStorage.setItem(
      'navigation_preferences',
      JSON.stringify({
        items: [{ id: 'dashboard', enabled: true }],
      })
    );
    setUserPreferencesCached({
      navigation: {
        items: [{ id: 'dashboard', enabled: true }],
      },
    });

    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();
    expect(result.current.isLoading).toBe(false);

    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
    expect(result.current.allItems.find((item) => item.id === 'dashboard')?.enabled).toBe(true);
  });

  it('removes workspace-disabled modules from the visible navigation model', async () => {
    setWorkspaceModuleAccessCached({
      cases: false,
    });

    const { result } = renderNavigationPreferencesHook();
    await flushNavigationPreferences();
    expect(result.current.isLoading).toBe(false);

    const casesItem = result.current.allItems.find((item) => item.id === 'cases');
    expect(casesItem).toBeUndefined();
    expect(result.current.enabledRouteIds).not.toContain('cases');
  });

  it('exports a cache invalidator for auth flows', () => {
    const invalidateSpy = vi.spyOn(
      navigationPreferencesModule,
      'invalidateNavigationPreferencesCache'
    );

    navigationPreferencesModule.invalidateNavigationPreferencesCache();

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});
