import { getBrandingCached } from '../brandingService';
import { getUserPreferencesCached, type UserPreferences } from '../userPreferencesService';
import type { BrandingConfig } from '../../types/branding';

export interface AuthenticatedShellBootstrapSnapshot {
  preferences: UserPreferences | null;
  branding: BrandingConfig;
}

export const preloadAuthenticatedShellBootstrap =
  async (): Promise<AuthenticatedShellBootstrapSnapshot> => {
    const [preferences, branding] = await Promise.all([
      getUserPreferencesCached(),
      getBrandingCached(),
    ]);

    return {
      preferences,
      branding,
    };
  };
