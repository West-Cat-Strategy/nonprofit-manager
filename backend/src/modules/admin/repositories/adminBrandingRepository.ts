import type { BrandingConfig } from '../lib/brandingStore';
import {
  getOrganizationBrandingConfig,
  upsertOrganizationBrandingConfig,
} from '../lib/brandingStore';

export const getBranding = async (
  organizationId: string
): Promise<BrandingConfig | Record<string, unknown>> =>
  getOrganizationBrandingConfig(organizationId);

export const updateBranding = async (
  organizationId: string,
  brandingConfig: BrandingConfig
): Promise<BrandingConfig | Record<string, unknown>> =>
  upsertOrganizationBrandingConfig(organizationId, brandingConfig);
