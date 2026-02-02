/**
 * Navigation Preferences Hook
 * Manages user preferences for navigation menu visibility
 * Stored in localStorage for persistence
 */

import { useState, useEffect, useCallback } from 'react';

export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  enabled: boolean;
  isCore: boolean; // Core items cannot be disabled (e.g., Dashboard)
}

export interface NavigationPreferences {
  items: NavigationItem[];
}

const STORAGE_KEY = 'navigation_preferences';

// Default navigation items with their default state
const defaultNavigationItems: NavigationItem[] = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: '📊', enabled: true, isCore: true },
  { id: 'cases', name: 'Cases', path: '/cases', icon: '📋', enabled: true, isCore: false },
  { id: 'people', name: 'People', path: '/contacts', icon: '👤', enabled: true, isCore: false },
  { id: 'accounts', name: 'Accounts', path: '/accounts', icon: '🏢', enabled: true, isCore: false },
  { id: 'volunteers', name: 'Volunteers', path: '/volunteers', icon: '🤝', enabled: true, isCore: false },
  { id: 'events', name: 'Events', path: '/events', icon: '📅', enabled: true, isCore: false },
  { id: 'donations', name: 'Donations', path: '/donations', icon: '💰', enabled: true, isCore: false },
  { id: 'tasks', name: 'Tasks', path: '/tasks', icon: '✓', enabled: true, isCore: false },
];

function loadPreferences(): NavigationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NavigationPreferences;
      // Merge with defaults to handle new items added after user saved preferences
      const mergedItems = defaultNavigationItems.map((defaultItem) => {
        const savedItem = parsed.items.find((item) => item.id === defaultItem.id);
        if (savedItem) {
          return { ...defaultItem, enabled: savedItem.enabled };
        }
        return defaultItem;
      });
      return { items: mergedItems };
    }
  } catch (error) {
    // If parsing fails, return defaults
  }
  return { items: defaultNavigationItems };
}

function savePreferences(preferences: NavigationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    // Handle localStorage errors silently
  }
}

export function useNavigationPreferences() {
  const [preferences, setPreferences] = useState<NavigationPreferences>(loadPreferences);

  // Reload preferences when localStorage changes (e.g., from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setPreferences(loadPreferences());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setPreferences((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          return { ...item, enabled: !item.enabled };
        }
        return item;
      });
      const newPrefs = { items: newItems };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const setItemEnabled = useCallback((itemId: string, enabled: boolean) => {
    setPreferences((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && !item.isCore) {
          return { ...item, enabled };
        }
        return item;
      });
      const newPrefs = { items: newItems };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaultPrefs = { items: defaultNavigationItems };
    savePreferences(defaultPrefs);
    setPreferences(defaultPrefs);
  }, []);

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
    resetToDefaults,
  };
}

export default useNavigationPreferences;
