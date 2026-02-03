export interface BrandingConfig {
  appName: string;
  appIcon: string | null;
  primaryColour: string;
  secondaryColour: string;
  favicon: string | null;
}

export const defaultBranding: BrandingConfig = {
  appName: 'Nonprofit Manager',
  appIcon: null,
  primaryColour: '#2563eb',
  secondaryColour: '#7c3aed',
  favicon: null,
};

