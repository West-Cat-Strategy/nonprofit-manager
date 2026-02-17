/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { BrandingConfig } from '../types/branding';
import { defaultBranding } from '../types/branding';
import { applyBrandingToDocument } from '../utils/branding';
import { useAppSelector } from '../store/hooks';

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
    setBrandingState(next);
    applyBrandingToDocument(next);
  }, []);

  const refreshBranding = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/admin/branding');
      const next = { ...defaultBranding, ...(response.data || {}) } as BrandingConfig;
      setBranding(next);
    } catch {
      // Keep defaults if the endpoint isn't reachable or returns an error
      setBranding(defaultBranding);
    }
  }, [isAuthenticated, setBranding]);

  useEffect(() => {
    if (!isAuthenticated) {
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
