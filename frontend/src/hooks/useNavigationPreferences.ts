/**
 * Navigation Preferences Hook
 * Manages user preferences for navigation menu visibility and order
 * Syncs with backend API for cross-device persistence
 * Falls back to localStorage when offline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAppSelector } from '../store/hooks';
import { getStartupStaffNavigationEntries } from '../routes/startupRouteCatalog';
import type { RouteArea, RouteNavKind, RouteSection } from '../routes/routeCatalog';
import { getUserPreferencesCached, mergeUserPreferencesCached } from '../services/userPreferencesService';

export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  area: RouteArea;
  section: RouteSection;
  navKind: RouteNavKind;
  parentId?: string;
  breadcrumbLabel: string;
  enabled: boolean;
  pinned?: boolean;
  isCore: boolean; // Core items cannot be disabled (e.g., Dashboard)
  group?: 'primary' | 'secondary' | 'utility';
  shortLabel?: string;
  ariaLabel?: string;
}

export interface NavigationPreferences {
  items: NavigationItem[];
}

export const MAX_PINNED_ITEMS = 3;

const STORAGE_KEY = 'navigation_preferences';
const PREFERENCE_KEY = 'navigation';
const PREFERENCES_CACHE_TTL_MS = 5 * 60 * 1000;
const routeFlags = {
  VITE_TEAM_CHAT_ENABLED: import.meta.env.VITE_TEAM_CHAT_ENABLED,
};

type PreferencesSnapshot = {
  preferences: NavigationPreferences;
  fetchedAt: number;
};

let preferencesSnapshot: PreferencesSnapshot | null = null;
let preferencesInFlightPromise: Promise<NavigationPreferences | null> | null = null;

const isPinnedEligible = (item: Pick<NavigationItem, 'id' | 'isCore' | 'enabled'>): boolean =>
  !item.isCore && item.id !== 'dashboard' && item.enabled;

const normalizeNavigationItem = (
  defaultItem: NavigationItem,
  savedItem?: Partial<NavigationItem>
): NavigationItem => {
  const enabled = savedItem?.enabled ?? defaultItem.enabled;
  const seeded = {
    ...defaultItem,
    enabled,
    pinned: Boolean(savedItem?.pinned),
  };

  if (!isPinnedEligible(seeded)) {
    seeded.pinned = false;
  }

  return seeded;
};

const clampPinnedItems = (items: NavigationItem[]): NavigationItem[] => {
  let count = 0;
  return items.map((item) => {
    if (!item.pinned) {
      return item;
    }
    if (!isPinnedEligible(item)) {
      return { ...item, pinned: false };
    }
    count += 1;
    if (count > MAX_PINNED_ITEMS) {
      return { ...item, pinned: false };
    }
    return item;
  });
};

const defaultNavigationItems: NavigationItem[] = getStartupStaffNavigationEntries(routeFlags)
  .filter((entry) => entry.staffNav?.group !== 'utility')
  .map((entry) => ({
    id: entry.id,
    name: entry.staffNav?.label || entry.title,
    path: entry.href || entry.path,
    icon: entry.staffNav?.icon || '•',
    area: entry.area,
    section: entry.section,
    navKind: entry.navKind,
    parentId: entry.parentId,
    breadcrumbLabel: entry.breadcrumbLabel,
    enabled: true,
    pinned: false,
    isCore: entry.id === 'dashboard',
    group: entry.staffNav?.group,
    shortLabel: entry.staffNav?.shortLabel,
    ariaLabel: entry.staffNav?.ariaLabel,
  }));

function mergeWithDefaults(savedItems: NavigationItem[] | undefined): NavigationItem[] {
  if (!savedItems || savedItems.length === 0) {
    return defaultNavigationItems;
  }

  const savedIds = new Set(savedItems.map((item) => item.id));
  const mergedItems: NavigationItem[] = [];

  // First, add items in their saved order with updated properties.
  for (const savedItem of savedItems) {
    const defaultItem = defaultNavigationItems.find((d) => d.id === savedItem.id);
    if (defaultItem) {
      mergedItems.push(normalizeNavigationItem(defaultItem, savedItem));
    }
  }

  // Then, add any new default items that weren't in saved preferences.
  for (const defaultItem of defaultNavigationItems) {
    if (!savedIds.has(defaultItem.id)) {
      mergedItems.push(defaultItem);
    }
  }

  // Ensure Dashboard is always first.
  const dashboardIndex = mergedItems.findIndex((item) => item.id === 'dashboard');
  if (dashboardIndex > 0) {
    const [dashboard] = mergedItems.splice(dashboardIndex, 1);
    mergedItems.unshift({ ...dashboard, pinned: false });
  }

  return clampPinnedItems(mergedItems);
}

function loadFromLocalStorage(): NavigationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NavigationPreferences;
      return { items: mergeWithDefaults(parsed.items) };
    }
  } catch {
    // If parsing fails, return defaults
  }
  return { items: defaultNavigationItems };
}

function saveToLocalStorage(preferences: NavigationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Handle localStorage errors silently
  }
}

const cachePreferencesSnapshot = (preferences: NavigationPreferences): void => {
  preferencesSnapshot = {
    preferences,
    fetchedAt: Date.now(),
  };
};

const isPreferencesSnapshotFresh = (snapshot: PreferencesSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < PREFERENCES_CACHE_TTL_MS;

const fetchServerPreferences = async (): Promise<NavigationPreferences | null> => {
  const serverPrefs = await getUserPreferencesCached();

  if (!serverPrefs?.[PREFERENCE_KEY] || typeof serverPrefs[PREFERENCE_KEY] !== 'object') {
    return null;
  }

  const value = serverPrefs[PREFERENCE_KEY] as { items?: NavigationItem[] };
  if (!Array.isArray(value.items)) {
    return null;
  }

  const preferences = { items: mergeWithDefaults(value.items) };
  cachePreferencesSnapshot(preferences);
  return preferences;
};

const getServerPreferences = async (): Promise<NavigationPreferences | null> => {
  if (preferencesSnapshot && isPreferencesSnapshotFresh(preferencesSnapshot)) {
    return preferencesSnapshot.preferences;
  }

  if (preferencesInFlightPromise) {
    return preferencesInFlightPromise;
  }

  const request = fetchServerPreferences();
  preferencesInFlightPromise = request;

  try {
    return await request;
  } finally {
    if (preferencesInFlightPromise === request) {
      preferencesInFlightPromise = null;
    }
  }
};

export function useNavigationPreferences() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [preferences, setPreferences] = useState<NavigationPreferences>(() => {
    const localPreferences = loadFromLocalStorage();
    cachePreferencesSnapshot(localPreferences);
    return localPreferences;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch preferences from API on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsSynced(false);
      setIsSaving(false);
      return;
    }

    let isMounted = true;
    const fetchPreferences = async () => {
      try {
        const serverPreferences = await getServerPreferences();
        if (!isMounted) return;

        if (serverPreferences) {
          setPreferences(serverPreferences);
          saveToLocalStorage(serverPreferences);
          setIsSynced(true);
        } else {
          setIsSynced(false);
        }
      } catch {
        if (!isMounted) return;
        // If API fails, use localStorage (offline support)
        setIsSynced(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchPreferences();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Save to API with debounce
  const saveToApi = useCallback((newPrefs: NavigationPreferences) => {
    // Clear any pending save.
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    setIsSynced(false);

    // Debounce API save by 500ms.
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.patch(`/auth/preferences/${PREFERENCE_KEY}`, {
          value: newPrefs,
        });
        mergeUserPreferencesCached(PREFERENCE_KEY, newPrefs);
        setIsSynced(true);
      } catch {
        setIsSynced(false);
        // API save failed, but localStorage is already updated.
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Reload preferences when localStorage changes (e.g., from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const nextPreferences = loadFromLocalStorage();
        cachePreferencesSnapshot(nextPreferences);
        setPreferences(nextPreferences);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updatePreferences = useCallback((newPrefs: NavigationPreferences) => {
    const normalizedPrefs = { items: clampPinnedItems(mergeWithDefaults(newPrefs.items)) };

    setPreferences(normalizedPrefs);
    saveToLocalStorage(normalizedPrefs);
    cachePreferencesSnapshot(normalizedPrefs);

    // Save to API if authenticated.
    if (isAuthenticated) {
      saveToApi(normalizedPrefs);
      return;
    }

    setIsSaving(false);
    setIsSynced(false);
  }, [isAuthenticated, saveToApi]);

  const toggleItem = useCallback((itemId: string) => {
    setPreferences((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          const enabled = !item.enabled;
          return {
            ...item,
            enabled,
            pinned: enabled ? item.pinned : false,
          };
        }
        return item;
      });
      const newPrefs = { items: newItems };
      updatePreferences(newPrefs);
      return newPrefs;
    });
  }, [updatePreferences]);

  const setItemEnabled = useCallback((itemId: string, enabled: boolean) => {
    setPreferences((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          return { ...item, enabled, pinned: enabled ? item.pinned : false };
        }
        return item;
      });
      const newPrefs = { items: newItems };
      updatePreferences(newPrefs);
      return newPrefs;
    });
  }, [updatePreferences]);

  const togglePinned = useCallback((itemId: string) => {
    setPreferences((prev) => {
      const target = prev.items.find((item) => item.id === itemId);
      if (!target || !isPinnedEligible(target)) {
        return prev;
      }

      const currentlyPinnedCount = prev.items.filter((item) => item.pinned).length;
      const tryingToPin = !target.pinned;
      if (tryingToPin && currentlyPinnedCount >= MAX_PINNED_ITEMS) {
        return prev;
      }

      const newItems = prev.items.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, pinned: !item.pinned };
      });
      const newPrefs = { items: newItems };
      updatePreferences(newPrefs);
      return newPrefs;
    });
  }, [updatePreferences]);

  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    setPreferences((prev) => {
      // Don't allow moving Dashboard (always at index 0)
      if (fromIndex === 0 || toIndex === 0) {
        return prev;
      }

      const newItems = [...prev.items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      const newPrefs = { items: newItems };
      updatePreferences(newPrefs);
      return newPrefs;
    });
  }, [updatePreferences]);

  const moveItemUp = useCallback((itemId: string) => {
    // Don't allow moving Dashboard
    if (itemId === 'dashboard') {
      return;
    }

    setPreferences((prev) => {
      const index = prev.items.findIndex((item) => item.id === itemId);
      // Can't move up if at position 0 or 1 (Dashboard is always at 0)
      if (index <= 1) {
        return prev;
      }
      const newItems = [...prev.items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      const newPrefs = { items: newItems };
      updatePreferences(newPrefs);
      return newPrefs;
    });
  }, [updatePreferences]);

  const moveItemDown = useCallback((itemId: string) => {
    // Don't allow moving Dashboard
    if (itemId === 'dashboard') {
      return;
    }

    setPreferences((prev) => {
      const index = prev.items.findIndex((item) => item.id === itemId);
      if (index < 1 || index >= prev.items.length - 1) {
        return prev;
      }
      const newItems = [...prev.items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      const newPrefs = { items: newItems };
      updatePreferences(newPrefs);
      return newPrefs;
    });
  }, [updatePreferences]);

  const resetToDefaults = useCallback(() => {
    const defaultPrefs = { items: defaultNavigationItems };
    updatePreferences(defaultPrefs);
    setPreferences(defaultPrefs);
  }, [updatePreferences]);

  const enabledItems = preferences.items.filter((item) => item.enabled);
  const pinnedItems = enabledItems.filter((item) => item.pinned).slice(0, MAX_PINNED_ITEMS);
  const unpinnedEnabledItems = enabledItems.filter((item) => !item.pinned);
  const primaryItems = unpinnedEnabledItems.slice(0, 4); // First 4 unpinned items are primary.
  const secondaryItems = unpinnedEnabledItems.slice(4); // Rest go under "More" menu.

  let syncStatus: 'saving' | 'synced' | 'offline' = 'offline';
  if (isSaving) {
    syncStatus = 'saving';
  } else if (isSynced) {
    syncStatus = 'synced';
  }

  return {
    preferences,
    allItems: preferences.items,
    enabledItems,
    pinnedItems,
    favoriteItems: pinnedItems,
    enabledRouteIds: enabledItems.map((item) => item.id),
    primaryItems,
    secondaryItems,
    toggleItem,
    setItemEnabled,
    togglePinned,
    reorderItems,
    moveItemUp,
    moveItemDown,
    resetToDefaults,
    isLoading,
    isSynced,
    isSaving,
    syncStatus,
    maxPinnedItems: MAX_PINNED_ITEMS,
  };
}

export const __resetNavigationPreferencesCacheForTests = (): void => {
  preferencesSnapshot = null;
  preferencesInFlightPromise = null;
};

export default useNavigationPreferences;
