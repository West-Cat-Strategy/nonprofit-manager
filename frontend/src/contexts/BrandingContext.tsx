/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { BrandingConfig } from '../types/branding';
import { defaultBranding } from '../types/branding';
import { applyBrandingToDocument } from '../utils/branding';
import { useAppSelector } from '../store/hooks';
import { getBrandingCached, setBrandingCached } from '../services/brandingService';

type BrandingContextValue = {
  branding: BrandingConfig;
  setBranding: (branding: BrandingConfig) => void;
  refreshBranding: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [branding, setBrandingState] = useState<BrandingConfig>(defaultBranding);

  const setBranding = useCallback((next: BrandingConfig) => {
    const cached = setBrandingCached(next);
    setBrandingState(cached);
    applyBrandingToDocument(cached);
  }, []);

  const refreshBranding = useCallback(async () => {
    if (!isAuthenticated) return;
    const next = await getBrandingCached();
    setBranding(next);
  }, [isAuthenticated, setBranding]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBrandingCached(defaultBranding);
      setBrandingState(defaultBranding);
      applyBrandingToDocument(defaultBranding, { setTitle: false });
      return;
    }
    refreshBranding();
  }, [isAuthenticated, refreshBranding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      setBranding,
      refreshBranding,
    }),
    [branding, refreshBranding, setBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextValue => {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return ctx;
};
