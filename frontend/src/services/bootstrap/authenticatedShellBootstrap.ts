import { defaultBranding, type BrandingConfig } from '../../types/branding';
import { getCachedStaffBootstrapSnapshot, getStaffBootstrapSnapshot } from './staffBootstrap';
import type { UserPreferences } from '../userPreferencesService';

export interface AuthenticatedShellBootstrapSnapshot {
  preferences: UserPreferences | null;
  branding: BrandingConfig;
}

export const preloadAuthenticatedShellBootstrap =
  async (): Promise<AuthenticatedShellBootstrapSnapshot> => {
    const seededSnapshot = getCachedStaffBootstrapSnapshot();
    if (seededSnapshot?.user) {
      return {
        preferences: seededSnapshot.preferences,
        branding: seededSnapshot.branding ?? defaultBranding,
      };
    }

    const snapshot = await getStaffBootstrapSnapshot();

    return {
      preferences: snapshot.preferences,
      branding: snapshot.branding ?? defaultBranding,
    };
  };
