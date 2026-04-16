import type { BrandingConfig } from '../lib/brandingStore';
import {
  getOrganizationBrandingConfig,
  upsertOrganizationBrandingConfig,
} from '../lib/brandingStore';

export const getBranding = async (): Promise<BrandingConfig | Record<string, unknown>> =>
  getOrganizationBrandingConfig();

export const updateBranding = async (
  brandingConfig: BrandingConfig
): Promise<BrandingConfig | Record<string, unknown>> =>
  upsertOrganizationBrandingConfig(brandingConfig);
