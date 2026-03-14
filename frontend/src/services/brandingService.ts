import api from './api';
import type { BrandingConfig } from '../types/branding';
import { defaultBranding } from '../types/branding';

const BRANDING_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedBranding: BrandingConfig | null = null;
let cachedAtMs = 0;
let inFlightRequest: Promise<BrandingConfig> | null = null;

const isFresh = (): boolean =>
  cachedBranding !== null && Date.now() - cachedAtMs < BRANDING_CACHE_TTL_MS;

const normalizeBranding = (value: unknown): BrandingConfig =>
  ({ ...defaultBranding, ...((value || {}) as Partial<BrandingConfig>) }) as BrandingConfig;

export const invalidateBrandingCache = (): void => {
  cachedBranding = null;
  cachedAtMs = 0;
  inFlightRequest = null;
};

export const __resetBrandingCacheForTests = (): void => {
  invalidateBrandingCache();
};

export const setBrandingCached = (branding: BrandingConfig): BrandingConfig => {
  cachedBranding = normalizeBranding(branding);
  cachedAtMs = Date.now();
  return cachedBranding;
};

export const getBrandingCachedSync = (): BrandingConfig | null => {
  if (!isFresh() || !cachedBranding) {
    return null;
  }

  return cachedBranding;
};

export const getBrandingCached = async (options?: {
  forceRefresh?: boolean;
}): Promise<BrandingConfig> => {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && isFresh() && cachedBranding) {
    return cachedBranding;
  }

  if (!forceRefresh && inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const response = await api.get('/admin/branding');
      return setBrandingCached(normalizeBranding(response.data));
    } catch {
      return setBrandingCached(defaultBranding);
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
};
