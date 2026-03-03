import { useState } from 'react';
import { defaultBranding, type BrandingConfig } from '../../../../types/branding';
import type { OrganizationConfig, SaveStatus } from '../types';
import { defaultConfig } from '../constants';

export const useOrganizationSettings = (initialMode: 'basic' | 'advanced') => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(initialMode === 'advanced');
  const [config, setConfig] = useState<OrganizationConfig>(defaultConfig);
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedOrganizationSnapshot, setSavedOrganizationSnapshot] = useState('');
  const [savedBrandingSnapshot, setSavedBrandingSnapshot] = useState('');
  const [organizationLastSavedAt, setOrganizationLastSavedAt] = useState<Date | null>(null);
  const [brandingLastSavedAt, setBrandingLastSavedAt] = useState<Date | null>(null);

  return {
    showAdvancedSettings,
    setShowAdvancedSettings,
    config,
    setConfig,
    branding,
    setBranding,
    isSaving,
    setIsSaving,
    saveStatus,
    setSaveStatus,
    savedOrganizationSnapshot,
    setSavedOrganizationSnapshot,
    savedBrandingSnapshot,
    setSavedBrandingSnapshot,
    organizationLastSavedAt,
    setOrganizationLastSavedAt,
    brandingLastSavedAt,
    setBrandingLastSavedAt,
  };
};

export type UseOrganizationSettingsReturn = ReturnType<typeof useOrganizationSettings>;
