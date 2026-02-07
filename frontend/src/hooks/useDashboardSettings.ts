import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import type { DashboardSettings, KpiKey } from '../components/dashboard';

const DASHBOARD_SETTINGS_KEY = 'dashboardSettings';
const DASHBOARD_SETTINGS_PREF_KEY = 'dashboard_settings';
const SAVE_DEBOUNCE_MS = 400;

const defaultDashboardSettings: DashboardSettings = {
  showQuickLookup: true,
  showQuickActions: true,
  showModules: true,
  showEngagementChart: true,
  showVolunteerWidget: true,
  kpis: {
    totalDonations: true,
    avgDonation: true,
    activeAccounts: true,
    activeContacts: true,
    activeCases: true,
    volunteers: true,
    volunteerHours: true,
    events: true,
    engagement: true,
  } as Record<KpiKey, boolean>,
};

const loadDashboardSettings = (): DashboardSettings => {
  try {
    const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (!raw) return defaultDashboardSettings;
    const parsed = JSON.parse(raw) as DashboardSettings;
    return {
      ...defaultDashboardSettings,
      ...parsed,
      kpis: {
        ...defaultDashboardSettings.kpis,
        ...(parsed.kpis || {}),
      },
    };
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
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }
        const response = await api.get<{ preferences: Record<string, DashboardSettings> }>('/auth/preferences');
        const serverPrefs = response.data?.preferences || {};
        if (serverPrefs[DASHBOARD_SETTINGS_PREF_KEY] && isMountedRef.current) {
          const merged: DashboardSettings = {
            ...defaultDashboardSettings,
            ...serverPrefs[DASHBOARD_SETTINGS_PREF_KEY],
            kpis: {
              ...defaultDashboardSettings.kpis,
              ...(serverPrefs[DASHBOARD_SETTINGS_PREF_KEY].kpis || {}),
            },
          };
          setSettingsState(merged);
          saveDashboardSettings(merged);
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
  }, []);

  // Save settings with debounce
  useEffect(() => {
    if (isLoading) return;

    saveDashboardSettings(settings);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await api.patch(`/auth/preferences/${DASHBOARD_SETTINGS_PREF_KEY}`, {
          value: settings,
        });
      } catch {
        // Ignore save errors (local cache still updated)
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [settings, isLoading]);

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

export { defaultDashboardSettings };
export type { DashboardSettings };
