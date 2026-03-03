/**
 * Navigation Preferences Hook
 * Manages user preferences for navigation menu visibility and order
 * Syncs with backend API for cross-device persistence
 * Falls back to localStorage when offline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAppSelector } from '../store/hooks';

export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  enabled: boolean;
  isCore: boolean; // Core items cannot be disabled (e.g., Dashboard)
  group?: 'primary' | 'secondary' | 'utility';
  shortLabel?: string;
  ariaLabel?: string;
}

export interface NavigationPreferences {
  items: NavigationItem[];
}

const STORAGE_KEY = 'navigation_preferences';
const PREFERENCE_KEY = 'navigation';
const teamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';

// Default navigation items with their default state
const defaultNavigationItems: NavigationItem[] = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: '📊', enabled: true, isCore: true, group: 'primary', shortLabel: 'Home', ariaLabel: 'Go to dashboard' },
  { id: 'cases', name: 'Cases', path: '/cases', icon: '📋', enabled: true, isCore: false, group: 'primary' },
  { id: 'external-service-providers', name: 'Providers', path: '/external-service-providers', icon: '🩺', enabled: true, isCore: false, group: 'secondary', shortLabel: 'Providers' },
  { id: 'people', name: 'People', path: '/contacts', icon: '👤', enabled: true, isCore: false, group: 'primary', ariaLabel: 'Go to contacts' },
  { id: 'accounts', name: 'Accounts', path: '/accounts', icon: '🏢', enabled: true, isCore: false, group: 'secondary' },
  { id: 'volunteers', name: 'Volunteers', path: '/volunteers', icon: '🤝', enabled: true, isCore: false, group: 'secondary' },
  { id: 'events', name: 'Events', path: '/events', icon: '📅', enabled: true, isCore: false, group: 'primary' },
  { id: 'donations', name: 'Donations', path: '/donations', icon: '💰', enabled: true, isCore: false, group: 'secondary' },
  { id: 'tasks', name: 'Tasks', path: '/tasks', icon: '✓', enabled: true, isCore: false, group: 'primary' },
  { id: 'follow-ups', name: 'Follow-ups', path: '/follow-ups', icon: '🔔', enabled: true, isCore: false, group: 'secondary' },
  { id: 'opportunities', name: 'Opportunities', path: '/opportunities', icon: '📈', enabled: true, isCore: false, group: 'secondary' },
  ...(teamChatEnabled
    ? [{ id: 'team-chat', name: 'Team Chat', path: '/team-chat', icon: '💬', enabled: true, isCore: false, group: 'secondary' as const }]
    : []),
  { id: 'scheduled-reports', name: 'Scheduled Reports', path: '/reports/scheduled', icon: '🗓️', enabled: true, isCore: false, group: 'utility', shortLabel: 'Schedules' },
];

function mergeWithDefaults(savedItems: NavigationItem[] | undefined): NavigationItem[] {
  if (!savedItems || savedItems.length === 0) {
    return defaultNavigationItems;
  }

  const savedIds = new Set(savedItems.map((item) => item.id));
  const mergedItems: NavigationItem[] = [];

  // First, add items in their saved order with updated properties
  for (const savedItem of savedItems) {
    const defaultItem = defaultNavigationItems.find((d) => d.id === savedItem.id);
    if (defaultItem) {
      mergedItems.push({
        ...defaultItem,
        enabled: savedItem.enabled,
      });
    }
  }

  // Then, add any new default items that weren't in saved preferences
  for (const defaultItem of defaultNavigationItems) {
    if (!savedIds.has(defaultItem.id)) {
      mergedItems.push(defaultItem);
    }
  }

  // Ensure Dashboard is always first
  const dashboardIndex = mergedItems.findIndex((item) => item.id === 'dashboard');
  if (dashboardIndex > 0) {
    const [dashboard] = mergedItems.splice(dashboardIndex, 1);
    mergedItems.unshift(dashboard);
  }

  return mergedItems;
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

export function useNavigationPreferences() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [preferences, setPreferences] = useState<NavigationPreferences>(loadFromLocalStorage);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch preferences from API on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await api.get('/auth/preferences');
        const serverPrefs = response.data.preferences;

        if (serverPrefs?.[PREFERENCE_KEY]) {
          const mergedItems = mergeWithDefaults(serverPrefs[PREFERENCE_KEY].items);
          const newPrefs = { items: mergedItems };
          setPreferences(newPrefs);
          saveToLocalStorage(newPrefs);
        }
        setIsSynced(true);
      } catch {
        // If API fails, use localStorage (offline support)
        setIsSynced(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if user is authenticated
    if (isAuthenticated) {
      fetchPreferences();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Save to API with debounce
  const saveToApi = useCallback((newPrefs: NavigationPreferences) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce API save by 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.patch(`/auth/preferences/${PREFERENCE_KEY}`, {
          value: newPrefs,
        });
        setIsSynced(true);
      } catch {
        setIsSynced(false);
        // API save failed, but localStorage is already updated
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
        setPreferences(loadFromLocalStorage());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updatePreferences = useCallback((newPrefs: NavigationPreferences) => {
    setPreferences(newPrefs);
    saveToLocalStorage(newPrefs);

    // Save to API if authenticated
    if (isAuthenticated) {
      saveToApi(newPrefs);
    }
  }, [isAuthenticated, saveToApi]);

  const toggleItem = useCallback((itemId: string) => {
    setPreferences((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          return { ...item, enabled: !item.enabled };
        }
        return item;
      });
      const newPrefs = { items: newItems };
      saveToLocalStorage(newPrefs);

      if (isAuthenticated) {
        saveToApi(newPrefs);
      }

      return newPrefs;
    });
  }, [isAuthenticated, saveToApi]);

  const setItemEnabled = useCallback((itemId: string, enabled: boolean) => {
    setPreferences((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          return { ...item, enabled };
        }
        return item;
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
  const primaryItems = enabledItems.slice(0, 4); // First 4 items are primary
  const secondaryItems = enabledItems.slice(4); // Rest go under "More" menu

  return {
    preferences,
    allItems: preferences.items,
    enabledItems,
    primaryItems,
    secondaryItems,
    toggleItem,
    setItemEnabled,
    reorderItems,
    moveItemUp,
    moveItemDown,
    resetToDefaults,
    isLoading,
    isSynced,
  };
}

export default useNavigationPreferences;
