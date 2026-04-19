/**
 * Navigation Preferences Hook
 * Manages user preferences for navigation menu visibility and order
 * Syncs with backend API for cross-device persistence
 * Falls back to localStorage when offline
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import { useAppSelector } from '../store/hooks';
import {
  getStaffNavigationEntries,
  type RouteArea,
  type RouteNavKind,
  type RouteSection,
} from '../routes/routeCatalog';
import {
  resolveWorkspaceModuleForRouteId,
  type WorkspaceModuleSettings,
} from '../features/workspaceModules/catalog';
import { useWorkspaceModuleAccess } from '../features/workspaceModules/useWorkspaceModuleAccess';
import { getUserPreferencesCached, mergeUserPreferencesCached } from '../services/userPreferencesService';
import { clearStaffBootstrapSnapshot } from '../services/bootstrap/staffBootstrap';

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
  workspaceEnabled: boolean;
  lockedByWorkspace: boolean;
  group?: 'primary' | 'secondary' | 'utility';
  shortLabel?: string;
  ariaLabel?: string;
}

export interface NavigationPreferences {
  items: NavigationItem[];
}

type PersistedNavigationItem = Omit<NavigationItem, 'workspaceEnabled' | 'lockedByWorkspace'>;

type PersistedNavigationPreferences = {
  items: PersistedNavigationItem[];
};

type NavigationPreferencesSyncState = {
  localFallback: NavigationPreferences;
  serverSnapshot: NavigationPreferences | null;
  hydrated: boolean;
  dirty: boolean;
};

export const MAX_PINNED_ITEMS = 3;

const STORAGE_KEY = 'navigation_preferences';
const PREFERENCE_KEY = 'navigation';
const PREFERENCES_CACHE_TTL_MS = 5 * 60 * 1000;
const routeFlags = {
  VITE_TEAM_CHAT_ENABLED: import.meta.env.VITE_TEAM_CHAT_ENABLED,
};

const getWorkspaceEnabledState = (
  routeId: string,
  workspaceModules: WorkspaceModuleSettings
): { workspaceEnabled: boolean; lockedByWorkspace: boolean } => {
  const moduleKey = resolveWorkspaceModuleForRouteId(routeId);
  if (!moduleKey) {
    return { workspaceEnabled: true, lockedByWorkspace: false };
  }

  const workspaceEnabled = workspaceModules[moduleKey] !== false;
  return {
    workspaceEnabled,
    lockedByWorkspace: !workspaceEnabled,
  };
};

type PreferencesSnapshot = {
  preferences: NavigationPreferences;
  fetchedAt: number;
};

let preferencesSnapshot: PreferencesSnapshot | null = null;
let preferencesInFlightPromise: Promise<NavigationPreferences | null> | null = null;

const isPinnedEligible = (item: Pick<NavigationItem, 'id' | 'isCore' | 'enabled'>): boolean =>
  !item.isCore && item.id !== 'dashboard' && item.enabled;

const isEffectivelyEnabled = (item: Pick<NavigationItem, 'enabled' | 'workspaceEnabled'>): boolean =>
  item.enabled && item.workspaceEnabled;

const areNavigationPreferencesEqual = (
  left: NavigationPreferences,
  right: NavigationPreferences
): boolean =>
  JSON.stringify(toPersistedPreferences(left)) === JSON.stringify(toPersistedPreferences(right));

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

const getDefaultNavigationItems = (
  workspaceModules: WorkspaceModuleSettings
): NavigationItem[] =>
  getStaffNavigationEntries(routeFlags, workspaceModules)
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
      ...getWorkspaceEnabledState(entry.id, workspaceModules),
      group: entry.staffNav?.group,
      shortLabel: entry.staffNav?.shortLabel,
      ariaLabel: entry.staffNav?.ariaLabel,
    }));

function mergeWithDefaults(
  savedItems: NavigationItem[] | undefined,
  defaultItems: NavigationItem[]
): NavigationItem[] {
  if (!savedItems || savedItems.length === 0) {
    return defaultItems;
  }

  const savedIds = new Set(savedItems.map((item) => item.id));
  const mergedItems: NavigationItem[] = [];

  // First, add items in their saved order with updated properties.
  for (const savedItem of savedItems) {
    const defaultItem = defaultItems.find((d) => d.id === savedItem.id);
    if (defaultItem) {
      mergedItems.push(normalizeNavigationItem(defaultItem, savedItem));
    }
  }

  // Then, add any new default items that weren't in saved preferences.
  for (const defaultItem of defaultItems) {
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

function loadFromLocalStorage(defaultItems: NavigationItem[]): NavigationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NavigationPreferences;
      return { items: mergeWithDefaults(parsed.items, defaultItems) };
    }
  } catch {
    // If parsing fails, return defaults
  }
  return { items: defaultItems };
}

const normalizeNavigationPreferences = (
  preferences: NavigationPreferences,
  defaultItems: NavigationItem[]
): NavigationPreferences => ({
  items: clampPinnedItems(mergeWithDefaults(preferences.items, defaultItems)),
});

function saveToLocalStorage(preferences: NavigationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedPreferences(preferences)));
  } catch {
    // Handle localStorage errors silently
  }
}

const toPersistedPreferences = (
  preferences: NavigationPreferences
): PersistedNavigationPreferences => ({
  items: preferences.items.map(({ workspaceEnabled: _workspaceEnabled, lockedByWorkspace: _lockedByWorkspace, ...item }) => item),
});

const currentServerSnapshotMatchesPreferences = (
  serverSnapshot: NavigationPreferences | null,
  preferences: NavigationPreferences
): boolean => (serverSnapshot ? areNavigationPreferencesEqual(serverSnapshot, preferences) : false);

const cachePreferencesSnapshot = (preferences: NavigationPreferences): void => {
  preferencesSnapshot = {
    preferences,
    fetchedAt: Date.now(),
  };
};

const isPreferencesSnapshotFresh = (snapshot: PreferencesSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < PREFERENCES_CACHE_TTL_MS;

const fetchServerPreferences = async (
  defaultItems: NavigationItem[]
): Promise<NavigationPreferences | null> => {
  const serverPrefs = await getUserPreferencesCached();

  if (!serverPrefs?.[PREFERENCE_KEY] || typeof serverPrefs[PREFERENCE_KEY] !== 'object') {
    return null;
  }

  const value = serverPrefs[PREFERENCE_KEY] as { items?: NavigationItem[] };
  if (!Array.isArray(value.items)) {
    return null;
  }

  const preferences = { items: mergeWithDefaults(value.items, defaultItems) };
  cachePreferencesSnapshot(preferences);
  return preferences;
};

const getServerPreferences = async (
  defaultItems: NavigationItem[]
): Promise<NavigationPreferences | null> => {
  if (preferencesSnapshot && isPreferencesSnapshotFresh(preferencesSnapshot)) {
    return {
      items: mergeWithDefaults(preferencesSnapshot.preferences.items, defaultItems),
    };
  }

  if (preferencesInFlightPromise) {
    return preferencesInFlightPromise;
  }

  const request = fetchServerPreferences(defaultItems);
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
  const workspaceModules = useWorkspaceModuleAccess();
  const defaultNavigationItems = useMemo(
    () => getDefaultNavigationItems(workspaceModules),
    [workspaceModules]
  );
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [preferences, setPreferencesState] = useState<NavigationPreferences>(() =>
    loadFromLocalStorage(defaultNavigationItems)
  );
  const [syncState, setSyncStateState] = useState<NavigationPreferencesSyncState>(() => {
    const localPreferences = loadFromLocalStorage(defaultNavigationItems);
    return {
      localFallback: localPreferences,
      serverSnapshot:
        preferencesSnapshot && isPreferencesSnapshotFresh(preferencesSnapshot)
          ? normalizeNavigationPreferences(preferencesSnapshot.preferences, defaultNavigationItems)
          : null,
      hydrated: false,
      dirty: false,
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferencesRef = useRef(preferences);
  const syncStateRef = useRef(syncState);

  const setSyncState = useCallback(
    (
      updater:
        | NavigationPreferencesSyncState
        | ((current: NavigationPreferencesSyncState) => NavigationPreferencesSyncState)
    ) => {
      setSyncStateState((current) => {
        const nextState = typeof updater === 'function' ? updater(current) : updater;
        syncStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsSynced(false);
      setIsSaving(false);
      setSyncState((current) => ({
        ...current,
        hydrated: true,
        dirty: false,
      }));
      return undefined;
    }

    let isMounted = true;
    const fetchPreferences = async () => {
      try {
        const serverPreferences = await getServerPreferences(defaultNavigationItems);
        if (!isMounted) {
          return;
        }

        if (serverPreferences) {
          const shouldApplyServerPreferences = !syncStateRef.current.dirty;
          if (shouldApplyServerPreferences) {
            preferencesRef.current = serverPreferences;
            setPreferencesState(serverPreferences);
          }

          setSyncState((current) => ({
            localFallback: shouldApplyServerPreferences ? serverPreferences : current.localFallback,
            serverSnapshot: serverPreferences,
            hydrated: true,
            dirty: current.dirty,
          }));
          setIsSynced(shouldApplyServerPreferences);
        } else {
          setSyncState((current) => ({
            ...current,
            hydrated: true,
          }));
          setIsSynced(false);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setSyncState((current) => ({
          ...current,
          hydrated: true,
        }));
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
  }, [defaultNavigationItems, isAuthenticated, setSyncState]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    saveToLocalStorage(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!isAuthenticated || !syncState.hydrated || !syncState.dirty) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setIsSaving(false);
      return undefined;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    setIsSynced(false);
    const preferencesToPersist = preferences;

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const persistedPreferences = toPersistedPreferences(preferencesToPersist);
        await api.patch(`/auth/preferences/${PREFERENCE_KEY}`, {
          value: persistedPreferences,
        });
        mergeUserPreferencesCached(PREFERENCE_KEY, persistedPreferences);
        clearStaffBootstrapSnapshot();
        cachePreferencesSnapshot(preferencesToPersist);
        const nextDirty = !areNavigationPreferencesEqual(
          preferencesRef.current,
          preferencesToPersist
        );
        setSyncState((current) => ({
          ...current,
          localFallback: preferencesRef.current,
          serverSnapshot: preferencesToPersist,
          dirty: nextDirty,
        }));
        setIsSynced(!nextDirty);
      } catch {
        setIsSynced(false);
      } finally {
        setIsSaving(false);
        saveTimeoutRef.current = null;
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, preferences, setSyncState, syncState.dirty, syncState.hydrated]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) {
        return;
      }

      const nextPreferences = loadFromLocalStorage(defaultNavigationItems);
      preferencesRef.current = nextPreferences;
      setPreferencesState(nextPreferences);
      setSyncState((current) => ({
        ...current,
        localFallback: nextPreferences,
        dirty: false,
      }));
      setIsSaving(false);
      setIsSynced(
        currentServerSnapshotMatchesPreferences(syncStateRef.current.serverSnapshot, nextPreferences)
      );
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [defaultNavigationItems, setSyncState]);

  useEffect(() => {
    const nextPreferences = normalizeNavigationPreferences(
      preferencesRef.current,
      defaultNavigationItems
    );
    const nextServerSnapshot = syncStateRef.current.serverSnapshot
      ? normalizeNavigationPreferences(syncStateRef.current.serverSnapshot, defaultNavigationItems)
      : null;
    const serverSnapshotChanged = nextServerSnapshot
      ? !currentServerSnapshotMatchesPreferences(syncStateRef.current.serverSnapshot, nextServerSnapshot)
      : syncStateRef.current.serverSnapshot !== null;

    if (
      areNavigationPreferencesEqual(preferencesRef.current, nextPreferences) &&
      !serverSnapshotChanged
    ) {
      return;
    }

    preferencesRef.current = nextPreferences;
    setPreferencesState(nextPreferences);
    setSyncState((current) => ({
      ...current,
      localFallback: nextPreferences,
      serverSnapshot: nextServerSnapshot,
    }));
    if (nextServerSnapshot) {
      setIsSynced(areNavigationPreferencesEqual(nextPreferences, nextServerSnapshot));
    }
  }, [defaultNavigationItems, setSyncState]);

  const updatePreferences = useCallback(
    (buildNextPreferences: (current: NavigationPreferences) => NavigationPreferences) => {
      const nextPreferences = normalizeNavigationPreferences(
        buildNextPreferences(preferencesRef.current),
        defaultNavigationItems
      );

      if (areNavigationPreferencesEqual(preferencesRef.current, nextPreferences)) {
        return;
      }

      preferencesRef.current = nextPreferences;
      setPreferencesState(nextPreferences);
      setSyncState((current) => ({
        ...current,
        localFallback: nextPreferences,
        dirty: isAuthenticated ? true : current.dirty,
      }));
      setIsSynced(false);

      if (!isAuthenticated) {
        setIsSaving(false);
      } else if (syncStateRef.current.hydrated) {
        setIsSaving(true);
      }
    },
    [defaultNavigationItems, isAuthenticated, setSyncState]
  );

  const toggleItem = useCallback((itemId: string) => {
    updatePreferences((current) => ({
      items: current.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          if (item.lockedByWorkspace) {
            return item;
          }
          const enabled = !item.enabled;
          return {
            ...item,
            enabled,
            pinned: enabled ? item.pinned : false,
          };
        }
        return item;
      }),
    }));
  }, [updatePreferences]);

  const setItemEnabled = useCallback((itemId: string, enabled: boolean) => {
    updatePreferences((current) => ({
      items: current.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          if (item.lockedByWorkspace) {
            return item;
          }
          return { ...item, enabled, pinned: enabled ? item.pinned : false };
        }
        return item;
      }),
    }));
  }, [updatePreferences]);

  const togglePinned = useCallback((itemId: string) => {
    updatePreferences((current) => {
      const target = current.items.find((item) => item.id === itemId);
      if (!target || !isPinnedEligible(target) || !target.workspaceEnabled) {
        return current;
      }

      const currentlyPinnedCount = current.items.filter((item) => item.pinned).length;
      const tryingToPin = !target.pinned;
      if (tryingToPin && currentlyPinnedCount >= MAX_PINNED_ITEMS) {
        return current;
      }

      return {
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, pinned: !item.pinned } : item
        ),
      };
    });
  }, [updatePreferences]);

  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    updatePreferences((current) => {
      if (fromIndex === 0 || toIndex === 0) {
        return current;
      }

      const newItems = [...current.items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return { items: newItems };
    });
  }, [updatePreferences]);

  const moveItemUp = useCallback((itemId: string) => {
    if (itemId === 'dashboard') {
      return;
    }

    updatePreferences((current) => {
      const index = current.items.findIndex((item) => item.id === itemId);
      if (index <= 1) {
        return current;
      }

      const newItems = [...current.items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      return { items: newItems };
    });
  }, [updatePreferences]);

  const moveItemDown = useCallback((itemId: string) => {
    if (itemId === 'dashboard') {
      return;
    }

    updatePreferences((current) => {
      const index = current.items.findIndex((item) => item.id === itemId);
      if (index < 1 || index >= current.items.length - 1) {
        return current;
      }

      const newItems = [...current.items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      return { items: newItems };
    });
  }, [updatePreferences]);

  const resetToDefaults = useCallback(() => {
    const defaultPreferences = normalizeNavigationPreferences(
      { items: defaultNavigationItems },
      defaultNavigationItems
    );
    if (areNavigationPreferencesEqual(preferencesRef.current, defaultPreferences)) {
      return;
    }

    preferencesRef.current = defaultPreferences;
    setPreferencesState(defaultPreferences);
    setSyncState((current) => ({
      ...current,
      localFallback: defaultPreferences,
      dirty: isAuthenticated ? true : current.dirty,
    }));
    setIsSynced(false);

    if (!isAuthenticated) {
      setIsSaving(false);
    } else if (syncStateRef.current.hydrated) {
      setIsSaving(true);
    }
  }, [defaultNavigationItems, isAuthenticated, setSyncState]);

  const enabledItems = preferences.items.filter((item) => isEffectivelyEnabled(item));
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

export const invalidateNavigationPreferencesCache = (): void => {
  preferencesSnapshot = null;
  preferencesInFlightPromise = null;
};

export const __resetNavigationPreferencesCacheForTests = (): void => {
  invalidateNavigationPreferencesCache();
};

export default useNavigationPreferences;
