
import type { ImportFieldOption } from '@modules/shared/import/peopleImportParser';
import type { ImportRowError } from '@modules/shared/import/importUtils';
import type { ContactFilters } from '@app-types/contact';

export type ExportableContactRow = {
  contact_id: string;
  account_id: string | null;
  account_number: string | null;
  account_name: string | null;
  first_name: string;
  preferred_name: string | null;
  last_name: string;
  middle_name: string | null;
  salutation: string | null;
  suffix: string | null;
  birth_date: string | null;
  gender: string | null;
  pronouns: string | null;
  phn: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  job_title: string | null;
  department: string | null;
  preferred_contact_method: string | null;
  do_not_email: boolean;
  do_not_phone: boolean;
  do_not_text: boolean;
  do_not_voicemail: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  no_fixed_address: boolean;
  notes: string | null;
  tags: string[];
  roles: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type ExportableContactQueryRow = Omit<ExportableContactRow, 'phn'> & {
  phn_encrypted: string | null;
};

export type ContactExportRequest = ContactFilters & {
  format: 'csv' | 'xlsx';
  ids?: string[];
  columns?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export type ParsedContactRow = {
  contact_id?: string;
  account_id?: string | null;
  account_number?: string | null;
  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  salutation?: string | null;
  suffix?: string | null;
  birth_date?: string | Date | null;
  gender?: string | null;
  pronouns?: string | null;
  phn?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  no_fixed_address?: boolean;
  job_title?: string | null;
  department?: string | null;
  preferred_contact_method?: string | null;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  do_not_text?: boolean;
  do_not_voicemail?: boolean;
  notes?: string | null;
  tags?: string[];
  roles?: string[];
  is_active?: boolean;
};

export type ContactImportAction =
  | {
      action: 'create';
      rowNumber: number;
      payload: ParsedContactRow;
      resolvedAccountId: string | null;
    }
  | {
      action: 'update';
      rowNumber: number;
      contactId: string;
      payload: ParsedContactRow;
      resolvedAccountId?: string | null;
    };

export interface ContactImportPreview {
  detected_columns: string[];
  mapping: Record<string, string>;
  mapping_candidates: Record<string, Array<{ field: string; score: number; reasons: string[] }>>;
  field_options: ImportFieldOption[];
  to_create: number;
  to_update: number;
  total_rows: number;
  row_errors: ImportRowError[];
  warnings: string[];
}

export interface ContactImportCommitResult {
  created: number;
  updated: number;
  total_processed: number;
  affected_ids: string[];
}
