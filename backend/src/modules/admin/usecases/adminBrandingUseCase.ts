import type { BrandingConfig } from '../lib/brandingStore';
import * as adminBrandingRepository from '../repositories/adminBrandingRepository';

export const getBranding = async (): Promise<BrandingConfig | Record<string, unknown>> =>
  adminBrandingRepository.getBranding();

export const updateBranding = async (
  brandingConfig: BrandingConfig
): Promise<BrandingConfig | Record<string, unknown>> =>
  adminBrandingRepository.updateBranding(brandingConfig);
