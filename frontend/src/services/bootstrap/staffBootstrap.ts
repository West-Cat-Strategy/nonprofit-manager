import api from '../api';
import { unwrapApiData, type ApiEnvelope } from '../apiEnvelope';
import type { User } from '../../features/auth/state';
import type { CurrentUserResponse } from '../authService';
import type { BrandingConfig } from '../../types/branding';
import {
  createDefaultWorkspaceModuleSettings,
  normalizeWorkspaceModuleSettings,
  type WorkspaceModuleSettings,
} from '../../features/workspaceModules/catalog';
import { setBrandingCached } from '../brandingService';
import { setUserPreferencesCached, type UserPreferences } from '../userPreferencesService';
import {
  setWorkspaceModuleAccessCached,
} from '../workspaceModuleAccessService';

export type BootstrapStatus = 'authenticated' | 'anonymous';

export interface StaffBootstrapSnapshot {
  status: BootstrapStatus;
  user: User | null;
  organizationId: string | null;
  branding: BrandingConfig | null;
  preferences: UserPreferences | null;
  workspaceModules: WorkspaceModuleSettings;
  fetchedAt: number;
}

type StaffBootstrapResponse = {
  user: CurrentUserResponse;
  organizationId: string | null;
  branding?: BrandingConfig | null;
  preferences?: UserPreferences | null;
  workspaceModules?: WorkspaceModuleSettings | null;
};

const STAFF_BOOTSTRAP_TTL_MS = 60_000;
const staffBootstrapMode = import.meta.env.VITE_UI_STAFF_BOOTSTRAP_MODE as
  | 'anonymous'
  | 'authenticated'
  | undefined;
const mockStaffUser: User = {
  id: 'ui-preview-staff',
  email: 'preview.staff@example.org',
  firstName: 'Preview',
  lastName: 'Staff',
  role: 'admin',
  profilePicture: null,
};

let cachedSnapshot: StaffBootstrapSnapshot | null = null;
let inFlightSnapshot: Promise<StaffBootstrapSnapshot> | null = null;

const NAVIGATION_STORAGE_KEY = 'navigation_preferences';
const DASHBOARD_SETTINGS_STORAGE_KEY = 'dashboardSettings';

const isFresh = (snapshot: StaffBootstrapSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < STAFF_BOOTSTRAP_TTL_MS;

const isStaffBootstrapBypassRoute = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.pathname.startsWith('/demo/') ||
    window.location.pathname.startsWith('/portal/')
  );
};

const normalizeStartupPreferences = (value: unknown): UserPreferences | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const preferences: UserPreferences = {};

  if (typeof candidate.timezone === 'string' && candidate.timezone.trim().length > 0) {
    preferences.timezone = candidate.timezone.trim();
  }

  if (candidate.navigation && typeof candidate.navigation === 'object' && !Array.isArray(candidate.navigation)) {
    preferences.navigation = candidate.navigation as UserPreferences['navigation'];
  }

  if (
    candidate.dashboard_settings &&
    typeof candidate.dashboard_settings === 'object' &&
    !Array.isArray(candidate.dashboard_settings)
  ) {
    (preferences as Record<string, unknown>).dashboard_settings = candidate.dashboard_settings;
  }

  return Object.keys(preferences).length > 0 ? preferences : {};
};

const normalizeStartupWorkspaceModules = (value: unknown): WorkspaceModuleSettings =>
  normalizeWorkspaceModuleSettings(value as Partial<WorkspaceModuleSettings> | null | undefined);

const seedStartupLocalStorage = (preferences: UserPreferences | null): void => {
  if (!preferences || typeof window === 'undefined') {
    return;
  }

  const navigation = preferences.navigation;
  if (navigation && typeof navigation === 'object' && !Array.isArray(navigation)) {
    try {
      window.localStorage.setItem(
        NAVIGATION_STORAGE_KEY,
        JSON.stringify({ items: (navigation as { items?: unknown[] }).items ?? [] })
      );
    } catch {
      // Ignore localStorage failures; hooks retain in-memory caches.
    }
  }

  const dashboardSettings = (preferences as Record<string, unknown>).dashboard_settings;
  if (dashboardSettings && typeof dashboardSettings === 'object' && !Array.isArray(dashboardSettings)) {
    try {
      window.localStorage.setItem(
        DASHBOARD_SETTINGS_STORAGE_KEY,
        JSON.stringify(dashboardSettings)
      );
    } catch {
      // Ignore localStorage failures; the user preference cache remains populated.
    }
  }
};

const buildAuthenticatedSnapshot = (input: {
  user: User;
  organizationId?: string | null;
  branding?: BrandingConfig | null;
  preferences?: UserPreferences | null;
  workspaceModules?: WorkspaceModuleSettings | null;
}): StaffBootstrapSnapshot => {
  const current =
    cachedSnapshot?.user?.id === input.user.id && cachedSnapshot.status === 'authenticated'
      ? cachedSnapshot
      : null;
  const nextPreferences = input.preferences ?? current?.preferences ?? {};
  const nextWorkspaceModules =
    input.workspaceModules ?? current?.workspaceModules ?? createDefaultWorkspaceModuleSettings();

  const snapshot: StaffBootstrapSnapshot = {
    status: 'authenticated',
    user: input.user,
    organizationId: input.organizationId ?? null,
    branding: input.branding ?? current?.branding ?? null,
    preferences: nextPreferences,
    workspaceModules: nextWorkspaceModules,
    fetchedAt: Date.now(),
  };

  if (snapshot.branding) {
    setBrandingCached(snapshot.branding);
  }

  setUserPreferencesCached(snapshot.preferences);
  setWorkspaceModuleAccessCached(snapshot.workspaceModules);
  seedStartupLocalStorage(snapshot.preferences);

  return snapshot;
};

const fetchStaffBootstrapSnapshot = async (): Promise<StaffBootstrapSnapshot> => {
  if (isStaffBootstrapBypassRoute()) {
    return {
      status: 'anonymous',
      user: null,
      organizationId: null,
      branding: null,
      preferences: null,
      workspaceModules: createDefaultWorkspaceModuleSettings(),
      fetchedAt: Date.now(),
    };
  }

  if (staffBootstrapMode === 'anonymous') {
    return {
      status: 'anonymous',
      user: null,
      organizationId: null,
      branding: null,
      preferences: null,
      workspaceModules: createDefaultWorkspaceModuleSettings(),
      fetchedAt: Date.now(),
    };
  }

  if (staffBootstrapMode === 'authenticated') {
    return buildAuthenticatedSnapshot({
      user: mockStaffUser,
      organizationId: null,
      branding: null,
      preferences: null,
      workspaceModules: createDefaultWorkspaceModuleSettings(),
    });
  }

  try {
    const response = await api.get<ApiEnvelope<StaffBootstrapResponse>>('/auth/bootstrap');
    const payload = unwrapApiData(response.data) as StaffBootstrapResponse;
    return buildAuthenticatedSnapshot({
      user: payload.user,
      organizationId: payload.organizationId ?? payload.user.organizationId ?? null,
      branding: payload.branding ?? null,
      preferences: normalizeStartupPreferences(payload.preferences),
      workspaceModules: normalizeStartupWorkspaceModules(payload.workspaceModules),
    });
  } catch {
    return {
      status: 'anonymous',
      user: null,
      organizationId: null,
      branding: null,
      preferences: null,
      workspaceModules: createDefaultWorkspaceModuleSettings(),
      fetchedAt: Date.now(),
    };
  }
};

export const getStaffBootstrapSnapshot = async (options?: {
  forceRefresh?: boolean;
  fallbackUser?: User | null;
  fallbackOrganizationId?: string | null;
}): Promise<StaffBootstrapSnapshot> => {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && cachedSnapshot && isFresh(cachedSnapshot)) {
    return cachedSnapshot;
  }

  if (!forceRefresh && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  const request = fetchStaffBootstrapSnapshot();
  inFlightSnapshot = request;

  try {
    let snapshot = await request;
    if (!snapshot.user && options?.fallbackUser) {
      const retrySnapshot = await fetchStaffBootstrapSnapshot();
      snapshot = retrySnapshot.user
        ? retrySnapshot
        : buildAuthenticatedSnapshot({
            user: options.fallbackUser,
            organizationId: options.fallbackOrganizationId ?? null,
          });
    }
    cachedSnapshot = snapshot;
    return snapshot;
  } finally {
    if (inFlightSnapshot === request) {
      inFlightSnapshot = null;
    }
  }
};

export const setStaffBootstrapSnapshot = (input: {
  user: User | null;
  organizationId?: string | null;
  branding?: BrandingConfig | null;
  preferences?: UserPreferences | null;
  workspaceModules?: WorkspaceModuleSettings | null;
}): StaffBootstrapSnapshot => {
  cachedSnapshot = input.user
    ? buildAuthenticatedSnapshot(input as {
        user: User;
        organizationId?: string | null;
        branding?: BrandingConfig | null;
        preferences?: UserPreferences | null;
        workspaceModules?: WorkspaceModuleSettings | null;
      })
    : {
        status: 'anonymous',
        user: null,
        organizationId: null,
        branding: null,
        preferences: null,
        workspaceModules: createDefaultWorkspaceModuleSettings(),
        fetchedAt: Date.now(),
      };
  return cachedSnapshot;
};

export const clearStaffBootstrapSnapshot = (): void => {
  cachedSnapshot = null;
  inFlightSnapshot = null;
};

export const getCachedStaffBootstrapSnapshot = (): StaffBootstrapSnapshot | null => {
  if (!cachedSnapshot || !isFresh(cachedSnapshot)) {
    return null;
  }

  return cachedSnapshot;
};
