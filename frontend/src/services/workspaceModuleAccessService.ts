import {
  areWorkspaceModuleSettingsEqual,
  createDefaultWorkspaceModuleSettings,
  normalizeWorkspaceModuleSettings,
  type PartialWorkspaceModuleSettings,
  type WorkspaceModuleSettings,
} from '../features/workspaceModules/catalog';

const STORAGE_KEY = 'workspace_module_settings';
const UPDATE_EVENT = 'workspace-modules:updated';

let cachedWorkspaceModules: WorkspaceModuleSettings | null = null;

const dispatchWorkspaceModuleUpdate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const clearWorkspaceModuleAccessCache = (): void => {
  const hadCachedValue = cachedWorkspaceModules !== null;
  cachedWorkspaceModules = null;
  if (typeof window !== 'undefined') {
    const hadStoredValue = window.localStorage.getItem(STORAGE_KEY) !== null;
    if (hadStoredValue) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (hadCachedValue || hadStoredValue) {
      dispatchWorkspaceModuleUpdate();
    }
  }
};

export const setWorkspaceModuleAccessCached = (
  value: PartialWorkspaceModuleSettings
): WorkspaceModuleSettings => {
  const normalized = normalizeWorkspaceModuleSettings(value);
  if (cachedWorkspaceModules && areWorkspaceModuleSettingsEqual(cachedWorkspaceModules, normalized)) {
    return cachedWorkspaceModules;
  }
  cachedWorkspaceModules = normalized;

  if (typeof window !== 'undefined') {
    const serialized = JSON.stringify(normalized);
    if (window.localStorage.getItem(STORAGE_KEY) !== serialized) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      dispatchWorkspaceModuleUpdate();
    }
  }

  return normalized;
};

export const getWorkspaceModuleAccessCachedSync = (): WorkspaceModuleSettings => {
  if (cachedWorkspaceModules) {
    return cachedWorkspaceModules;
  }

  if (typeof window === 'undefined') {
    return createDefaultWorkspaceModuleSettings();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedWorkspaceModules = normalizeWorkspaceModuleSettings(
        JSON.parse(stored) as PartialWorkspaceModuleSettings
      );
      return cachedWorkspaceModules;
    }
  } catch {
    // Ignore storage parse failures and fall back to defaults.
  }

  cachedWorkspaceModules = createDefaultWorkspaceModuleSettings();
  return cachedWorkspaceModules;
};

export const subscribeWorkspaceModuleAccess = (
  callback: () => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleCustomEvent = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedWorkspaceModules = null;
      callback();
    }
  };

  window.addEventListener(UPDATE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(UPDATE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
  };
};
