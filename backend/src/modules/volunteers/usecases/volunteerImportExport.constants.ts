import type { TabularExportColumn } from '@modules/shared/export/tabularExport';
import type { ExportableVolunteerRow } from './volunteerImportExport.types';

export const VOLUNTEER_EXPORT_COLUMNS: Array<TabularExportColumn<ExportableVolunteerRow>> = [
  { key: 'volunteer_id', header: 'volunteer_id', width: 38 },
  { key: 'contact_id', header: 'contact_id', width: 38 },
  { key: 'account_id', header: 'account_id', width: 38 },
  { key: 'account_number', header: 'account_number', width: 18 },
  { key: 'account_name', header: 'account_name', width: 24 },
  { key: 'first_name', header: 'first_name', width: 18 },
  { key: 'preferred_name', header: 'preferred_name', width: 18 },
  { key: 'last_name', header: 'last_name', width: 18 },
  { key: 'email', header: 'email', width: 24 },
  { key: 'phone', header: 'phone', width: 18 },
  { key: 'mobile_phone', header: 'mobile_phone', width: 18 },
  { key: 'tags', header: 'tags', width: 22, map: (row) => row.tags.join('; ') },
  { key: 'roles', header: 'roles', width: 22, map: (row) => row.roles.join('; ') },
  { key: 'skills', header: 'skills', width: 24, map: (row) => row.skills.join('; ') },
  { key: 'availability_status', header: 'availability_status', width: 18 },
  { key: 'availability_notes', header: 'availability_notes', width: 24 },
  { key: 'background_check_status', header: 'background_check_status', width: 22 },
  { key: 'background_check_date', header: 'background_check_date', width: 18 },
  { key: 'background_check_expiry', header: 'background_check_expiry', width: 18 },
  {
    key: 'preferred_roles',
    header: 'preferred_roles',
    width: 24,
    map: (row) => row.preferred_roles.join('; '),
  },
  {
    key: 'certifications',
    header: 'certifications',
    width: 24,
    map: (row) => row.certifications.join('; '),
  },
  { key: 'max_hours_per_week', header: 'max_hours_per_week', width: 18 },
  { key: 'emergency_contact_name', header: 'emergency_contact_name', width: 24 },
  { key: 'emergency_contact_phone', header: 'emergency_contact_phone', width: 20 },
  {
    key: 'emergency_contact_relationship',
    header: 'emergency_contact_relationship',
    width: 24,
  },
  { key: 'volunteer_since', header: 'volunteer_since', width: 16 },
  { key: 'total_hours_logged', header: 'total_hours_logged', width: 18 },
  { key: 'is_active', header: 'is_active', width: 12 },
  { key: 'created_at', header: 'created_at', width: 22 },
  { key: 'updated_at', header: 'updated_at', width: 22 },
];

export const VOLUNTEER_TEMPLATE_COLUMNS = VOLUNTEER_EXPORT_COLUMNS.filter(
  (column) =>
    !['account_name', 'created_at', 'updated_at', 'volunteer_since', 'total_hours_logged'].includes(
      column.key
    )
);

export const VOLUNTEER_DEFAULT_INCLUDED_EXPORT_COLUMN_KEYS = [
  'volunteer_id',
  'contact_id',
  'email',
];

export const VOLUNTEER_SORT_COLUMNS: Record<string, string> = {
  created_at: 'v.created_at',
  updated_at: 'v.updated_at',
  first_name: 'c.first_name',
  last_name: 'c.last_name',
  email: 'c.email',
  availability_status: 'v.availability_status',
  background_check_status: 'v.background_check_status',
};
