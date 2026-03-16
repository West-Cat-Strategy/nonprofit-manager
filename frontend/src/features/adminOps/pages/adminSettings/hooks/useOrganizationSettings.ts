import { useCallback, useState } from 'react';
import api from '../../../../../services/api';
import { clearStaffBootstrapSnapshot } from '../../../../../services/bootstrap/staffBootstrap';
import { setWorkspaceModuleAccessCached } from '../../../../../services/workspaceModuleAccessService';
import { defaultBranding, type BrandingConfig } from '../../../../../types/branding';
import { normalizeWorkspaceModuleSettings } from '../../../../../features/workspaceModules/catalog';
import type {
  OrganizationAddress,
  OrganizationConfig,
  OrganizationSettings,
  SaveStatus,
} from '../types';
import { defaultConfig } from '../constants';
import { formatCanadianPhone, formatCanadianPostalCode } from '../utils';

const serializeOrganizationConfig = (value: OrganizationConfig): string => JSON.stringify(value);
const serializeBrandingConfig = (value: BrandingConfig): string => JSON.stringify(value);

const mergeAddress = (
  base: OrganizationAddress,
  value?: Partial<OrganizationAddress> | null
): OrganizationAddress => ({
  ...base,
  ...(value || {}),
});

const mergeOrganizationConfig = (
  value?: Partial<OrganizationConfig> | null
): OrganizationConfig => ({
  ...defaultConfig,
  ...(value || {}),
  address: mergeAddress(defaultConfig.address, value?.address),
  taxReceipt: {
    ...defaultConfig.taxReceipt,
    ...(value?.taxReceipt || {}),
    receiptingAddress: mergeAddress(
      defaultConfig.taxReceipt.receiptingAddress,
      value?.taxReceipt?.receiptingAddress
    ),
  },
  workspaceModules: normalizeWorkspaceModuleSettings(value?.workspaceModules),
});

const getTaxReceiptMissingFields = (config: OrganizationConfig): string[] => {
  const missing: string[] = [];
  const taxReceipt = config.taxReceipt;
  const receiptingAddress = taxReceipt.receiptingAddress;

  if (!taxReceipt.legalName.trim()) missing.push('Legal charity name');
  if (!taxReceipt.charitableRegistrationNumber.trim()) {
    missing.push('Charitable registration number');
  }
  if (!receiptingAddress.line1.trim()) missing.push('Receipting address line 1');
  if (!receiptingAddress.city.trim()) missing.push('Receipting address city');
  if (!receiptingAddress.province.trim()) missing.push('Receipting address province/state');
  if (!receiptingAddress.postalCode.trim()) missing.push('Receipting address postal code');
  if (!receiptingAddress.country.trim()) missing.push('Receipting address country');
  if (!taxReceipt.receiptIssueLocation.trim()) missing.push('Receipt issue location');
  if (!taxReceipt.authorizedSignerName.trim()) missing.push('Authorized signer name');
  if (!taxReceipt.authorizedSignerTitle.trim()) missing.push('Authorized signer title');
  if (!taxReceipt.contactEmail.trim()) missing.push('Receipt contact email');
  if (!taxReceipt.contactPhone.trim()) missing.push('Receipt contact phone');

  return missing;
};

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
    const [settingsResult, brandingResult] = await Promise.all([
      api
        .get<OrganizationSettings>('/admin/organization-settings')
        .then((response) => ({ ok: true as const, data: response.data }))
        .catch(() => ({ ok: false as const, data: null })),
      api
        .get('/admin/branding')
        .then((response) => ({ ok: true as const, data: response.data }))
        .catch(() => ({ ok: false as const, data: defaultBranding })),
    ]);

    const resolvedConfig = settingsResult.data
      ? mergeOrganizationConfig(settingsResult.data.config)
      : defaultConfig;
    const resolvedBranding = brandingResult.data
      ? ({ ...defaultBranding, ...brandingResult.data } as BrandingConfig)
      : defaultBranding;

    setConfig(resolvedConfig);
    setWorkspaceModuleAccessCached(resolvedConfig.workspaceModules);
    setSavedOrganizationSnapshot(serializeOrganizationConfig(resolvedConfig));
    setOrganizationLastSavedAt(
      settingsResult.ok && settingsResult.data?.updatedAt
        ? new Date(settingsResult.data.updatedAt)
        : null
    );
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

  const handleTaxReceiptChange = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      taxReceipt: { ...prev.taxReceipt, [field]: value },
    }));
  };

  const handleTaxReceiptAddressChange = (field: string, value: string) => {
    let formattedValue = value;
    if (
      field === 'postalCode' &&
      config.taxReceipt.receiptingAddress.country === 'Canada'
    ) {
      formattedValue = formatCanadianPostalCode(value);
    }

    setConfig((prev) => ({
      ...prev,
      taxReceipt: {
        ...prev.taxReceipt,
        receiptingAddress: {
          ...prev.taxReceipt.receiptingAddress,
          [field]: formattedValue,
        },
      },
    }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = config.phoneFormat === 'canadian' ? formatCanadianPhone(value) : value;
    setConfig((prev) => ({ ...prev, phone: formatted }));
  };

  const handleTaxReceiptPhoneChange = (value: string) => {
    const formatted = config.phoneFormat === 'canadian' ? formatCanadianPhone(value) : value;
    setConfig((prev) => ({
      ...prev,
      taxReceipt: {
        ...prev.taxReceipt,
        contactPhone: formatted,
      },
    }));
  };

  const handleBrandingChange = (field: string, value: string) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  };

  const handleWorkspaceModuleChange = (field: keyof OrganizationConfig['workspaceModules']) => {
    setConfig((prev) => ({
      ...prev,
      workspaceModules: {
        ...prev.workspaceModules,
        [field]: !prev.workspaceModules[field],
      },
    }));
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
      const response = await api.put<OrganizationSettings>('/admin/organization-settings', {
        config,
      });
      const savedConfig = mergeOrganizationConfig(response.data?.config ?? config);
      setConfig(savedConfig);
      clearStaffBootstrapSnapshot();
      setWorkspaceModuleAccessCached(savedConfig.workspaceModules);
      setSavedOrganizationSnapshot(serializeOrganizationConfig(savedConfig));
      setOrganizationLastSavedAt(
        response.data?.updatedAt ? new Date(response.data.updatedAt) : new Date()
      );
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
  const taxReceiptMissingFields = getTaxReceiptMissingFields(config);
  const isTaxReceiptComplete = taxReceiptMissingFields.length === 0;

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
    handleTaxReceiptChange,
    handleTaxReceiptAddressChange,
    handlePhoneChange,
    handleTaxReceiptPhoneChange,
    handleBrandingChange,
    handleWorkspaceModuleChange,
    handleImageUpload,
    handleSaveOrganization,
    handleSaveBranding,
    isOrganizationDirty,
    isBrandingDirty,
    taxReceiptMissingFields,
    isTaxReceiptComplete,
  };
};

export type UseOrganizationSettingsReturn = ReturnType<typeof useOrganizationSettings>;
