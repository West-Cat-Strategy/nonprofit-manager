import { z } from 'zod';

type StorageVersion = number;

interface StorageEntry<T> {
  version: StorageVersion;
  data: T;
  timestamp: number;
}

interface StorageConfig<T> {
  key: string;
  version: StorageVersion;
  schema: z.ZodType<T>;
  defaultValue: T;
  migrations?: Record<number, (data: unknown) => unknown>;
}

const STORAGE_PREFIX = 'npm_';

/**
 * Type-safe localStorage wrapper with validation, versioning, and migrations
 */
export function createStorage<T>(config: StorageConfig<T>) {
  const { key, version, schema, defaultValue, migrations = {} } = config;
  const fullKey = `${STORAGE_PREFIX}${key}`;

  const applyMigrations = (entry: StorageEntry<unknown>): T => {
    let data = entry.data;
    let currentVersion = entry.version;

    while (currentVersion < version) {
      const migration = migrations[currentVersion + 1];
      if (migration) {
        data = migration(data);
      }
      currentVersion++;
    }

    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  };

  return {
    get(): T {
      try {
        const raw = localStorage.getItem(fullKey);
        if (!raw) return defaultValue;

        const parsed = JSON.parse(raw) as StorageEntry<unknown>;

        if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) {
          // Legacy data without versioning
          const result = schema.safeParse(parsed);
          return result.success ? result.data : defaultValue;
        }

        if (parsed.version === version) {
          const result = schema.safeParse(parsed.data);
          return result.success ? result.data : defaultValue;
        }

        if (parsed.version < version) {
          const migrated = applyMigrations(parsed);
          // Save migrated data
          this.set(migrated);
          return migrated;
        }

        // Version is higher than expected (downgrade scenario)
        return defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set(value: T): boolean {
      try {
        const entry: StorageEntry<T> = {
          version,
          data: value,
          timestamp: Date.now(),
        };
        localStorage.setItem(fullKey, JSON.stringify(entry));
        return true;
      } catch {
        return false;
      }
    },

    update(updater: (current: T) => T): boolean {
      const current = this.get();
      return this.set(updater(current));
    },

    remove(): void {
      localStorage.removeItem(fullKey);
    },

    exists(): boolean {
      return localStorage.getItem(fullKey) !== null;
    },
  };
}

// Pre-defined storage schemas and instances

const authTokenSchema = z.string();
export const authTokenStorage = createStorage({
  key: 'token',
  version: 1,
  schema: authTokenSchema,
  defaultValue: '',
});

const organizationIdSchema = z.string();
export const organizationIdStorage = createStorage({
  key: 'organizationId',
  version: 1,
  schema: organizationIdSchema,
  defaultValue: '',
});

const dashboardSettingsSchema = z.object({
  showQuickLookup: z.boolean(),
  showQuickActions: z.boolean(),
  showModules: z.boolean(),
  showEngagementChart: z.boolean(),
  showVolunteerWidget: z.boolean(),
  kpis: z.record(z.string(), z.boolean()),
});

export type DashboardSettings = z.infer<typeof dashboardSettingsSchema>;

export const dashboardSettingsStorage = createStorage<DashboardSettings>({
  key: 'dashboardSettings',
  version: 1,
  schema: dashboardSettingsSchema,
  defaultValue: {
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
    },
  },
});

const sidebarStateSchema = z.object({
  collapsed: z.boolean(),
  expandedGroups: z.array(z.string()),
});

export type SidebarState = z.infer<typeof sidebarStateSchema>;

export const sidebarStateStorage = createStorage<SidebarState>({
  key: 'sidebarState',
  version: 1,
  schema: sidebarStateSchema,
  defaultValue: {
    collapsed: false,
    expandedGroups: [],
  },
});

const themePreferenceSchema = z.object({
  theme: z.enum(['neo-brutalist', 'sea-breeze', 'corporate-minimalist', 'clean-modern', 'glassmorphism']),
  darkMode: z.boolean(),
});

export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const themePreferenceStorage = createStorage<ThemePreference>({
  key: 'themePreference',
  version: 1,
  schema: themePreferenceSchema,
  defaultValue: {
    theme: 'neo-brutalist',
    darkMode: false,
  },
});

const recentSearchesSchema = z.array(z.string());

export const recentSearchesStorage = createStorage<string[]>({
  key: 'recentSearches',
  version: 1,
  schema: recentSearchesSchema,
  defaultValue: [],
});

/**
 * Utility to clear all app storage (for logout)
 */
export function clearAllAppStorage(): void {
  const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
  keys.forEach(key => localStorage.removeItem(key));
  // Also clear legacy keys
  localStorage.removeItem('organizationId');
  localStorage.removeItem('dashboardSettings');
}

/**
 * Get storage usage stats
 */
export function getStorageStats(): { used: number; items: number } {
  let used = 0;
  let items = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
        items++;
      }
    }
  }

  return { used: used * 2, items }; // UTF-16 uses 2 bytes per character
}
