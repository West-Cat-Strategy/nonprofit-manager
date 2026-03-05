import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PropsWithChildren } from 'react';
import api from '../../services/api';
import { rootReducer } from '../../store';
import {
  MAX_PINNED_ITEMS,
  __resetNavigationPreferencesCacheForTests,
  useNavigationPreferences,
} from '../useNavigationPreferences';

const renderNavigationPreferencesHook = () => {
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

  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useNavigationPreferences(), { wrapper });
};

describe('useNavigationPreferences', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
    __resetNavigationPreferencesCacheForTests();
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: {} } });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows pinning up to max and blocks additional pins', async () => {
    const { result } = renderNavigationPreferencesHook();

    await act(async () => {
      await Promise.resolve();
    });

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

    await act(async () => {
      await Promise.resolve();
    });

    const target = result.current.allItems.find((item) => item.id === 'cases');
    expect(target).toBeTruthy();

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
  });

  it('exposes saving and synced states while persisting preferences', async () => {
    const { result } = renderNavigationPreferencesHook();

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.togglePinned('cases');
    });

    expect(result.current.isSaving).toBe(true);
    expect(result.current.syncStatus).toBe('saving');

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(vi.mocked(api.patch)).toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSynced).toBe(true);
    expect(result.current.syncStatus).toBe('synced');
  });
});
