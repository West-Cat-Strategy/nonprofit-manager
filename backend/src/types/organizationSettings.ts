export interface OrganizationAddress {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface OrganizationTaxReceiptSettings {
  legalName: string;
  charitableRegistrationNumber: string;
  receiptingAddress: OrganizationAddress;
  receiptIssueLocation: string;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  contactEmail: string;
  contactPhone: string;
  advantageAmount: number;
}

export interface OrganizationSettingsConfig {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: OrganizationAddress;
  timezone: string;
  dateFormat: string;
  currency: string;
  fiscalYearStart: string;
  measurementSystem: 'metric' | 'imperial';
  phoneFormat: 'canadian' | 'us' | 'international';
  taxReceipt: OrganizationTaxReceiptSettings;
}

export interface OrganizationSettings {
  organizationId: string;
  config: OrganizationSettingsConfig;
  createdAt: string;
  updatedAt: string;
}

export const createDefaultOrganizationAddress = (): OrganizationAddress => ({
  line1: '',
  line2: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Canada',
});

export const createDefaultOrganizationTaxReceiptSettings = (): OrganizationTaxReceiptSettings => ({
  legalName: '',
  charitableRegistrationNumber: '',
  receiptingAddress: createDefaultOrganizationAddress(),
  receiptIssueLocation: '',
  authorizedSignerName: '',
  authorizedSignerTitle: '',
  contactEmail: '',
  contactPhone: '',
  advantageAmount: 0,
});

export const createDefaultOrganizationSettingsConfig = (): OrganizationSettingsConfig => ({
  name: '',
  email: '',
  phone: '',
  website: '',
  address: createDefaultOrganizationAddress(),
  timezone: 'America/Vancouver',
  dateFormat: 'YYYY-MM-DD',
  currency: 'CAD',
  fiscalYearStart: '04',
  measurementSystem: 'metric',
  phoneFormat: 'canadian',
  taxReceipt: createDefaultOrganizationTaxReceiptSettings(),
});
