import type { BrandingConfig } from '../lib/brandingStore';
import * as adminBrandingRepository from '../repositories/adminBrandingRepository';

export const getBranding = async (
  organizationId: string
): Promise<BrandingConfig | Record<string, unknown>> =>
  adminBrandingRepository.getBranding(organizationId);

export const updateBranding = async (
  organizationId: string,
  brandingConfig: BrandingConfig
): Promise<BrandingConfig | Record<string, unknown>> =>
  adminBrandingRepository.updateBranding(organizationId, brandingConfig);
