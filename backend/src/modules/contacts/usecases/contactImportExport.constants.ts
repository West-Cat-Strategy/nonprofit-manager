import type { TabularExportColumn } from '@modules/shared/export/tabularExport';
import type { ExportableContactRow } from './contactImportExport.types';

export const CONTACT_EXPORT_COLUMNS: Array<TabularExportColumn<ExportableContactRow>> = [
  { key: 'contact_id', header: 'contact_id', width: 38 },
  { key: 'account_id', header: 'account_id', width: 38 },
  { key: 'account_number', header: 'account_number', width: 18 },
  { key: 'account_name', header: 'account_name', width: 24 },
  { key: 'first_name', header: 'first_name', width: 18 },
  { key: 'preferred_name', header: 'preferred_name', width: 18 },
  { key: 'last_name', header: 'last_name', width: 18 },
  { key: 'middle_name', header: 'middle_name', width: 18 },
  { key: 'salutation', header: 'salutation', width: 14 },
  { key: 'suffix', header: 'suffix', width: 14 },
  { key: 'birth_date', header: 'birth_date', width: 16 },
  { key: 'gender', header: 'gender', width: 14 },
  { key: 'pronouns', header: 'pronouns', width: 14 },
  { key: 'phn', header: 'phn', width: 16 },
  { key: 'email', header: 'email', width: 24 },
  { key: 'phone', header: 'phone', width: 18 },
  { key: 'mobile_phone', header: 'mobile_phone', width: 18 },
  { key: 'job_title', header: 'job_title', width: 20 },
  { key: 'department', header: 'department', width: 20 },
  { key: 'preferred_contact_method', header: 'preferred_contact_method', width: 22 },
  { key: 'do_not_email', header: 'do_not_email', width: 14 },
  { key: 'do_not_phone', header: 'do_not_phone', width: 14 },
  { key: 'do_not_text', header: 'do_not_text', width: 14 },
  { key: 'do_not_voicemail', header: 'do_not_voicemail', width: 16 },
  { key: 'address_line1', header: 'address_line1', width: 24 },
  { key: 'address_line2', header: 'address_line2', width: 24 },
  { key: 'city', header: 'city', width: 18 },
  { key: 'state_province', header: 'state_province', width: 18 },
  { key: 'postal_code', header: 'postal_code', width: 16 },
  { key: 'country', header: 'country', width: 18 },
  { key: 'no_fixed_address', header: 'no_fixed_address', width: 18 },
  { key: 'notes', header: 'notes', width: 36 },
  {
    key: 'tags',
    header: 'tags',
    width: 24,
    map: (row) => row.tags.join('; '),
  },
  {
    key: 'roles',
    header: 'roles',
    width: 24,
    map: (row) => row.roles.join('; '),
  },
  { key: 'is_active', header: 'is_active', width: 12 },
  { key: 'created_at', header: 'created_at', width: 22 },
  { key: 'updated_at', header: 'updated_at', width: 22 },
];

export const CONTACT_TEMPLATE_COLUMNS = CONTACT_EXPORT_COLUMNS.filter(
  (column) => !['account_name', 'created_at', 'updated_at'].includes(column.key)
);

export const CONTACT_DEFAULT_EXPORT_COLUMN_KEYS = CONTACT_EXPORT_COLUMNS
  .map((column) => column.key)
  .filter((key) => key !== 'phn');

export const CONTACT_PHN_EXPORT_ROLES = new Set(['admin', 'manager', 'staff']);

export const CONTACT_SORT_COLUMNS: Record<string, string> = {
  created_at: 'c.created_at',
  updated_at: 'c.updated_at',
  first_name: 'c.first_name',
  last_name: 'c.last_name',
  email: 'c.email',
  account_name: 'a.account_name',
};
