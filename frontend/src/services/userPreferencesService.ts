import api from './api';

export interface UserPreferences {
  timezone?: string;
  navigation?: {
    items?: unknown[];
  };
  organization?: {
    timezone?: string;
  };
}

interface UserPreferencesResponse {
  preferences?: UserPreferences;
}

const PREFERENCES_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPreferences: UserPreferences | null = null;
let cachedAtMs = 0;
let inFlightRequest: Promise<UserPreferences | null> | null = null;

const readTimezone = (preferences: UserPreferences | null | undefined): string | null => {
  const organizationTimezone = preferences?.organization?.timezone?.trim();
  if (organizationTimezone) {
    return organizationTimezone;
  }

  const userTimezone = preferences?.timezone?.trim();
  return userTimezone || null;
};

export const __resetUserPreferencesCacheForTests = (): void => {
  cachedPreferences = null;
  cachedAtMs = 0;
  inFlightRequest = null;
};

export const invalidateUserPreferencesCache = (): void => {
  cachedPreferences = null;
  cachedAtMs = 0;
  inFlightRequest = null;
};

export const setUserPreferencesCached = (preferences: UserPreferences | null): UserPreferences | null => {
  cachedPreferences = preferences;
  cachedAtMs = Date.now();
  return cachedPreferences;
};

export const getUserPreferencesCachedSync = (): UserPreferences | null => {
  if (!cachedPreferences || Date.now() - cachedAtMs >= PREFERENCES_CACHE_TTL_MS) {
    return null;
  }

  return cachedPreferences;
};

export const mergeUserPreferencesCached = (
  key: string,
  value: unknown
): UserPreferences | null => {
  const nextPreferences = {
    ...(cachedPreferences || {}),
    [key]: value,
  } as UserPreferences;

  return setUserPreferencesCached(nextPreferences);
};

export const getUserPreferencesCached = async (options?: {
  forceRefresh?: boolean;
}): Promise<UserPreferences | null> => {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && cachedPreferences && now - cachedAtMs < PREFERENCES_CACHE_TTL_MS) {
    return cachedPreferences;
  }

  if (!forceRefresh && inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const response = await api.get<UserPreferencesResponse>('/auth/preferences');
      const nextPreferences = response.data?.preferences || null;
      return setUserPreferencesCached(nextPreferences);
    } catch {
      return null;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
};

export const getUserTimezoneCached = async (fallback: string): Promise<string> => {
  const preferences = await getUserPreferencesCached();
  return readTimezone(preferences) || fallback;
};
