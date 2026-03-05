import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { defaultDashboardSettings } from '../components/dashboard';
import type { DashboardSettings } from '../components/dashboard';
import { useAppSelector } from '../store/hooks';

const DASHBOARD_SETTINGS_KEY = 'dashboardSettings';
const DASHBOARD_SETTINGS_PREF_KEY = 'dashboard_settings';
const SAVE_DEBOUNCE_MS = 400;
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

type DashboardSettingsSnapshot = {
  settings: DashboardSettings;
  fetchedAt: number;
};

let dashboardSettingsSnapshot: DashboardSettingsSnapshot | null = null;
let dashboardSettingsInFlight: Promise<DashboardSettings | null> | null = null;

const normalizeDashboardSettings = (settings: Partial<DashboardSettings> | null | undefined): DashboardSettings => ({
  ...defaultDashboardSettings,
  ...(settings || {}),
  kpis: {
    ...defaultDashboardSettings.kpis,
    ...(settings?.kpis || {}),
  },
});

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

const fetchServerDashboardSettings = async (): Promise<DashboardSettings | null> => {
  const freshSnapshot = getFreshDashboardSettingsSnapshot();
  if (freshSnapshot) {
    return freshSnapshot;
  }

  if (dashboardSettingsInFlight) {
    return dashboardSettingsInFlight;
  }

  dashboardSettingsInFlight = api
    .get<{ preferences?: Record<string, Partial<DashboardSettings> | undefined> }>('/auth/preferences')
    .then((response) => {
      const serverSettings = response.data?.preferences?.[DASHBOARD_SETTINGS_PREF_KEY];
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
  const [settings, setSettingsState] = useState<DashboardSettings>(defaultDashboardSettings);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Load settings on mount
  useEffect(() => {
    isMountedRef.current = true;
    const localSettings = loadDashboardSettings();
    setSettingsState(localSettings);

    const fetchServerSettings = async () => {
      try {
        if (!isAuthenticated) {
          setIsLoading(false);
          return;
        }
        const serverSettings = await fetchServerDashboardSettings();
        if (serverSettings && isMountedRef.current) {
          setSettingsState(serverSettings);
          saveDashboardSettings(serverSettings);
        }
      } catch {
        // Keep local settings if server fetch fails
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
  }, [isAuthenticated]);

  // Save settings with debounce
  useEffect(() => {
    if (isLoading) return;

    saveDashboardSettings(settings);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        if (!isAuthenticated) return;
        await api.patch(`/auth/preferences/${DASHBOARD_SETTINGS_PREF_KEY}`, {
          value: settings,
        });
        setDashboardSettingsSnapshot(settings);
      } catch {
        // Ignore save errors (local cache still updated)
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [settings, isLoading, isAuthenticated]);

  const setSettings = useCallback((newSettings: DashboardSettings) => {
    setSettingsState(newSettings);
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(defaultDashboardSettings);
  }, []);

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
