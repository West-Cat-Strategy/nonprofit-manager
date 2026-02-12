import type { OrganizationConfig } from './types';

// ============================================================================
// Canadian Defaults
// ============================================================================

export const defaultConfig: OrganizationConfig = {
  name: '',
  email: '',
  phone: '',
  website: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Canada',
  },
  timezone: 'America/Vancouver',
  dateFormat: 'YYYY-MM-DD',
  currency: 'CAD',
  fiscalYearStart: '04',
  measurementSystem: 'metric',
  phoneFormat: 'canadian',
};

// ============================================================================
// Constants - Canadian-centric options
// ============================================================================

export const timezones = [
  { value: 'America/Vancouver', label: 'Pacific Time (PT) - Vancouver' },
  { value: 'America/Edmonton', label: 'Mountain Time (MT) - Edmonton' },
  { value: 'America/Regina', label: 'Central Time (CT) - Saskatchewan' },
  { value: 'America/Winnipeg', label: 'Central Time (CT) - Winnipeg' },
  { value: 'America/Toronto', label: 'Eastern Time (ET) - Toronto' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT) - Halifax' },
  { value: 'America/St_Johns', label: "Newfoundland Time (NT) - St. John's" },
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
  { value: 'UTC', label: 'UTC' },
];

export const dateFormats = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31) - ISO Standard' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024) - US Style' },
  { value: 'MMMM D, YYYY', label: 'MMMM D, YYYY (December 31, 2024)' },
];

export const currencies = [
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: '$' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (\u20AC)', symbol: '\u20AC' },
  { value: 'GBP', label: 'British Pound (\u00A3)', symbol: '\u00A3' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: '$' },
];

export const provinces = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
];

export const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export type PermissionDefinition = {
  key: string;
  label: string;
  category: string;
};

export const defaultPermissions: PermissionDefinition[] = [
  { key: 'contacts.view', label: 'View Contacts', category: 'Contacts' },
  { key: 'contacts.create', label: 'Create Contacts', category: 'Contacts' },
  { key: 'contacts.edit', label: 'Edit Contacts', category: 'Contacts' },
  { key: 'contacts.delete', label: 'Delete Contacts', category: 'Contacts' },
  { key: 'donations.view', label: 'View Donations', category: 'Donations' },
  { key: 'donations.create', label: 'Create Donations', category: 'Donations' },
  { key: 'donations.edit', label: 'Edit Donations', category: 'Donations' },
  { key: 'donations.delete', label: 'Delete Donations', category: 'Donations' },
  { key: 'volunteers.view', label: 'View Volunteers', category: 'Volunteers' },
  { key: 'volunteers.create', label: 'Create Volunteers', category: 'Volunteers' },
  { key: 'volunteers.edit', label: 'Edit Volunteers', category: 'Volunteers' },
  { key: 'volunteers.delete', label: 'Delete Volunteers', category: 'Volunteers' },
  { key: 'events.view', label: 'View Events', category: 'Events' },
  { key: 'events.create', label: 'Create Events', category: 'Events' },
  { key: 'events.edit', label: 'Edit Events', category: 'Events' },
  { key: 'events.delete', label: 'Delete Events', category: 'Events' },
  { key: 'cases.view', label: 'View Cases', category: 'Cases' },
  { key: 'cases.create', label: 'Create Cases', category: 'Cases' },
  { key: 'cases.edit', label: 'Edit Cases', category: 'Cases' },
  { key: 'cases.delete', label: 'Delete Cases', category: 'Cases' },
  { key: 'reports.view', label: 'View Reports', category: 'Reports' },
  { key: 'reports.export', label: 'Export Reports', category: 'Reports' },
  { key: 'admin.users', label: 'Manage Users', category: 'Admin' },
  { key: 'admin.roles', label: 'Manage Roles', category: 'Admin' },
  { key: 'admin.settings', label: 'Manage Settings', category: 'Admin' },
];

export const adminSettingsTabs = [
  { id: 'organization', label: 'Organization' },
  { id: 'branding', label: 'Branding' },
  { id: 'users', label: 'Users & Security' },
  { id: 'portal', label: 'Client Portal' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'other', label: 'Other Settings' },
] as const;
