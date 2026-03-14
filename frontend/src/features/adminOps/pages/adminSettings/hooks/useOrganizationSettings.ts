import { useCallback, useState } from 'react';
import api from '../../../../../services/api';
import { clearStaffBootstrapSnapshot } from '../../../../../services/bootstrap/staffBootstrap';
import { mergeUserPreferencesCached } from '../../../../../services/userPreferencesService';
import { defaultBranding, type BrandingConfig } from '../../../../../types/branding';
import type { OrganizationConfig, SaveStatus } from '../types';
import { defaultConfig } from '../constants';
import { formatCanadianPhone, formatCanadianPostalCode } from '../utils';

const serializeOrganizationConfig = (value: OrganizationConfig): string => JSON.stringify(value);
const serializeBrandingConfig = (value: BrandingConfig): string => JSON.stringify(value);

type UseOrganizationSettingsParams = {
  initialMode: 'basic' | 'advanced';
  setGlobalBranding: (branding: BrandingConfig) => void;
};

export const useOrganizationSettings = ({
  initialMode,
  setGlobalBranding,
}: UseOrganizationSettingsParams) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(initialMode === 'advanced');
  const [config, setConfig] = useState<OrganizationConfig>(defaultConfig);
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedOrganizationSnapshot, setSavedOrganizationSnapshot] = useState('');
  const [savedBrandingSnapshot, setSavedBrandingSnapshot] = useState('');
  const [organizationLastSavedAt, setOrganizationLastSavedAt] = useState<Date | null>(null);
  const [brandingLastSavedAt, setBrandingLastSavedAt] = useState<Date | null>(null);

  const loadOrganizationData = useCallback(async (): Promise<void> => {
    const [configResponse, brandingResult] = await Promise.all([
      api.get('/auth/preferences').catch(() => ({ data: { preferences: {} } })),
      api
        .get('/admin/branding')
        .then((response) => ({ ok: true as const, data: response.data }))
        .catch(() => ({ ok: false as const, data: defaultBranding })),
    ]);

    const prefs = configResponse.data.preferences;
    const resolvedConfig = prefs?.organization
      ? ({ ...defaultConfig, ...prefs.organization } as OrganizationConfig)
      : defaultConfig;
    const resolvedBranding = brandingResult.data
      ? ({ ...defaultBranding, ...brandingResult.data } as BrandingConfig)
      : defaultBranding;

    setConfig(resolvedConfig);
    setSavedOrganizationSnapshot(serializeOrganizationConfig(resolvedConfig));
    setBranding(resolvedBranding);
    setSavedBrandingSnapshot(serializeBrandingConfig(resolvedBranding));
    if (brandingResult.ok) {
      setGlobalBranding(resolvedBranding);
    }
  }, [setGlobalBranding]);

  const handleChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === 'postalCode' && config.address.country === 'Canada') {
      formattedValue = formatCanadianPostalCode(value);
    }
    setConfig((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: formattedValue },
    }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = config.phoneFormat === 'canadian' ? formatCanadianPhone(value) : value;
    setConfig((prev) => ({ ...prev, phone: formatted }));
  };

  const handleBrandingChange = (field: string, value: string) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File, type: 'icon' | 'favicon') => {
    const maxSize = type === 'favicon' ? 1 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'icon') {
        setBranding((prev) => ({ ...prev, appIcon: base64 }));
      } else {
        setBranding((prev) => ({ ...prev, favicon: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveOrganization = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await api.patch('/auth/preferences/organization', { value: config });
      mergeUserPreferencesCached('organization', config);
      clearStaffBootstrapSnapshot();
      setSavedOrganizationSnapshot(serializeOrganizationConfig(config));
      setOrganizationLastSavedAt(new Date());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const response = await api.put('/admin/branding', branding);
      const saved = { ...defaultBranding, ...(response.data || {}) } as BrandingConfig;
      setBranding(saved);
      setGlobalBranding(saved);
      clearStaffBootstrapSnapshot();
      setSavedBrandingSnapshot(serializeBrandingConfig(saved));
      setBrandingLastSavedAt(new Date());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const isOrganizationDirty =
    savedOrganizationSnapshot !== '' &&
    serializeOrganizationConfig(config) !== savedOrganizationSnapshot;
  const isBrandingDirty =
    savedBrandingSnapshot !== '' && serializeBrandingConfig(branding) !== savedBrandingSnapshot;

  return {
    loadOrganizationData,
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
    handleChange,
    handleAddressChange,
    handlePhoneChange,
    handleBrandingChange,
    handleImageUpload,
    handleSaveOrganization,
    handleSaveBranding,
    isOrganizationDirty,
    isBrandingDirty,
  };
};

export type UseOrganizationSettingsReturn = ReturnType<typeof useOrganizationSettings>;
