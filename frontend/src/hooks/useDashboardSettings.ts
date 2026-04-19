import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
  defaultDashboardSettings,
  normalizeDashboardSettings,
  type DashboardSettings,
} from '../features/dashboard/types/viewSettings';
import { useAppSelector } from '../store/hooks';
import { getUserPreferencesCached, mergeUserPreferencesCached } from '../services/userPreferencesService';
import { clearStaffBootstrapSnapshot } from '../services/bootstrap/staffBootstrap';

const DASHBOARD_SETTINGS_KEY = 'dashboardSettings';
const DASHBOARD_SETTINGS_PREF_KEY = 'dashboard_settings';
const SAVE_DEBOUNCE_MS = 400;
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

type DashboardSettingsSnapshot = {
  settings: DashboardSettings;
  fetchedAt: number;
};

type DashboardSettingsSyncState = {
  localFallback: DashboardSettings;
  serverSnapshot: DashboardSettings | null;
  hydrated: boolean;
  dirty: boolean;
};

let dashboardSettingsSnapshot: DashboardSettingsSnapshot | null = null;
let dashboardSettingsInFlight: Promise<DashboardSettings | null> | null = null;

const getFreshDashboardSettingsSnapshot = (): DashboardSettings | null => {
  if (!dashboardSettingsSnapshot) {
    return null;
  }
  if (Date.now() - dashboardSettingsSnapshot.fetchedAt >= SETTINGS_CACHE_TTL_MS) {
    dashboardSettingsSnapshot = null;
    return null;
  }
  return dashboardSettingsSnapshot.settings;
};

const setDashboardSettingsSnapshot = (settings: DashboardSettings): void => {
  dashboardSettingsSnapshot = {
    settings,
    fetchedAt: Date.now(),
  };
};

const areDashboardSettingsEqual = (
  left: DashboardSettings,
  right: DashboardSettings
): boolean =>
  Object.keys(defaultDashboardSettings).every((key) => {
    const settingKey = key as keyof DashboardSettings;
    return left[settingKey] === right[settingKey];
  });

const createDashboardSettingsSyncState = (
  localFallback: DashboardSettings
): DashboardSettingsSyncState => ({
  localFallback,
  serverSnapshot: getFreshDashboardSettingsSnapshot(),
  hydrated: false,
  dirty: false,
});

const fetchServerDashboardSettings = async (): Promise<DashboardSettings | null> => {
  const freshSnapshot = getFreshDashboardSettingsSnapshot();
  if (freshSnapshot) {
    return freshSnapshot;
  }

  if (dashboardSettingsInFlight) {
    return dashboardSettingsInFlight;
  }

  dashboardSettingsInFlight = getUserPreferencesCached()
    .then((preferences) => {
      const record = preferences as Record<string, Partial<DashboardSettings> | undefined> | null;
      const serverSettings = record?.[DASHBOARD_SETTINGS_PREF_KEY];
      if (!serverSettings) {
        return null;
      }
      const normalizedSettings = normalizeDashboardSettings(serverSettings);
      setDashboardSettingsSnapshot(normalizedSettings);
      return normalizedSettings;
    })
    .finally(() => {
      dashboardSettingsInFlight = null;
    });

  return dashboardSettingsInFlight;
};

const loadDashboardSettings = (): DashboardSettings => {
  try {
    const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (!raw) return defaultDashboardSettings;
    const parsed = JSON.parse(raw) as Partial<DashboardSettings>;
    return normalizeDashboardSettings(parsed);
  } catch {
    return defaultDashboardSettings;
  }
};

const saveDashboardSettings = (settings: DashboardSettings): void => {
  try {
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
};

interface UseDashboardSettingsResult {
  settings: DashboardSettings;
  setSettings: (settings: DashboardSettings) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

export function useDashboardSettings(): UseDashboardSettingsResult {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [settings, setSettingsState] = useState<DashboardSettings>(() => loadDashboardSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncStateState] = useState<DashboardSettingsSyncState>(() =>
    createDashboardSettingsSyncState(loadDashboardSettings())
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const settingsRef = useRef(settings);
  const syncStateRef = useRef(syncState);

  const setSyncState = useCallback(
    (
      updater:
        | DashboardSettingsSyncState
        | ((current: DashboardSettingsSyncState) => DashboardSettingsSyncState)
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
    settingsRef.current = settings;
  }, [settings]);

  // Load settings on mount
  useEffect(() => {
    isMountedRef.current = true;
    const localSettings = loadDashboardSettings();
    setSettingsState(localSettings);
    settingsRef.current = localSettings;
    setSyncState((current) => ({
      ...current,
      localFallback: localSettings,
      hydrated: false,
      dirty: false,
    }));

    const fetchServerSettings = async () => {
      try {
        if (!isAuthenticated) {
          setSyncState((current) => ({
            ...current,
            hydrated: true,
            dirty: false,
          }));
          setIsLoading(false);
          return;
        }
        const serverSettings = await fetchServerDashboardSettings();
        if (!isMountedRef.current) {
          return;
        }

        if (serverSettings) {
          const shouldApplyServerSettings = !syncStateRef.current.dirty;
          if (shouldApplyServerSettings) {
            settingsRef.current = serverSettings;
            setSettingsState(serverSettings);
          }

          setSyncState((current) => ({
            localFallback: shouldApplyServerSettings ? serverSettings : current.localFallback,
            serverSnapshot: serverSettings,
            hydrated: true,
            dirty: current.dirty,
          }));
        } else {
          setSyncState((current) => ({
            ...current,
            hydrated: true,
          }));
        }
      } catch {
        // Keep local settings if server fetch fails
        if (isMountedRef.current) {
          setSyncState((current) => ({
            ...current,
            hydrated: true,
          }));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchServerSettings();

    return () => {
      isMountedRef.current = false;
    };
  }, [isAuthenticated, setSyncState]);

  useEffect(() => {
    saveDashboardSettings(settings);
  }, [settings]);

  // Save settings with debounce
  useEffect(() => {
    if (!syncState.hydrated || !syncState.dirty || !isAuthenticated) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return undefined;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const settingsToPersist = settings;
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.patch(`/auth/preferences/${DASHBOARD_SETTINGS_PREF_KEY}`, {
          value: settingsToPersist,
        });
        mergeUserPreferencesCached(DASHBOARD_SETTINGS_PREF_KEY, settingsToPersist);
        clearStaffBootstrapSnapshot();
        setDashboardSettingsSnapshot(settingsToPersist);
        setSyncState({
          localFallback: settingsRef.current,
          serverSnapshot: settingsToPersist,
          hydrated: true,
          dirty: !areDashboardSettingsEqual(settingsRef.current, settingsToPersist),
        });
      } catch {
        // Ignore save errors (local cache still updated)
      } finally {
        saveTimerRef.current = null;
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isAuthenticated, settings, setSyncState, syncState.dirty, syncState.hydrated]);

  const setSettings = useCallback((newSettings: DashboardSettings) => {
    const normalizedSettings = normalizeDashboardSettings(newSettings);
    if (areDashboardSettingsEqual(settingsRef.current, normalizedSettings)) {
      return;
    }

    settingsRef.current = normalizedSettings;
    setSettingsState(normalizedSettings);
    setSyncState((current) => ({
      ...current,
      localFallback: normalizedSettings,
      dirty: isAuthenticated ? true : current.dirty,
    }));
  }, [isAuthenticated, setSyncState]);

  const resetSettings = useCallback(() => {
    if (areDashboardSettingsEqual(settingsRef.current, defaultDashboardSettings)) {
      return;
    }

    settingsRef.current = defaultDashboardSettings;
    setSettingsState(defaultDashboardSettings);
    setSyncState((current) => ({
      ...current,
      localFallback: defaultDashboardSettings,
      dirty: isAuthenticated ? true : current.dirty,
    }));
  }, [isAuthenticated, setSyncState]);

  return {
    settings,
    setSettings,
    resetSettings,
    isLoading,
  };
}

export const __resetDashboardSettingsServerCacheForTests = (): void => {
  dashboardSettingsSnapshot = null;
  dashboardSettingsInFlight = null;
};
