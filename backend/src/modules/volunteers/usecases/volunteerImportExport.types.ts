import { z } from 'zod';
import type { VolunteerFilters } from '@app-types/volunteer';
import type {
  ImportFieldCandidate,
  ImportFieldOption,
  ParsedPeopleImportFile,
} from '@modules/shared/import/peopleImportParser';
import type { ImportRowError } from '@modules/shared/import/importUtils';

export type ExportableVolunteerRow = {
  volunteer_id: string;
  contact_id: string;
  account_id: string | null;
  account_number: string | null;
  account_name: string | null;
  first_name: string;
  preferred_name: string | null;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  tags: string[];
  roles: string[];
  skills: string[];
  availability_status: string | null;
  availability_notes: string | null;
  background_check_status: string | null;
  background_check_date: string | null;
  background_check_expiry: string | null;
  preferred_roles: string[];
  certifications: string[];
  max_hours_per_week: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  volunteer_since: string | null;
  total_hours_logged: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type VolunteerExportRequest = VolunteerFilters & {
  format: 'csv' | 'xlsx';
  ids?: string[];
  columns?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export type ParsedVolunteerImportRow = {
  volunteer_id?: string;
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
  skills?: string[];
  availability_status?: 'available' | 'unavailable' | 'limited';
  availability_notes?: string | null;
  background_check_status?:
    | 'not_required'
    | 'pending'
    | 'in_progress'
    | 'approved'
    | 'rejected'
    | 'expired'
    | null;
  background_check_date?: string | Date | null;
  background_check_expiry?: string | Date | null;
  preferred_roles?: string[];
  certifications?: string[];
  max_hours_per_week?: number | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  is_active?: boolean;
};

export type VolunteerImportAction = {
  rowNumber: number;
  volunteerId?: string;
  contactId?: string;
  contactAction: 'create' | 'update' | 'none';
  volunteerAction: 'create' | 'update';
  contactPayload: ParsedVolunteerImportRow;
  volunteerPayload: ParsedVolunteerImportRow;
  resolvedAccountId?: string | null;
};

export type VolunteerImportIdentity = {
  volunteerId?: string;
  contactId: string;
};

export type VolunteerImportIdentityLookup = {
  byVolunteerId: Map<string, VolunteerImportIdentity>;
  byContactId: Map<string, VolunteerImportIdentity>;
  byEmail: Map<string, VolunteerImportIdentity[]>;
};

export type VolunteerAccountLookup = {
  byId: Map<string, string>;
  byNumber: Map<string, string>;
};

export type VolunteerImportAnalysisResult = {
  actions: VolunteerImportAction[];
  toCreate: number;
  toUpdate: number;
  totalRows: number;
  rowErrors: ImportRowError[];
  warnings: string[];
};

export type VolunteerImportPlan = {
  parsed: ParsedPeopleImportFile;
  analysis: VolunteerImportAnalysisResult;
};

export interface VolunteerImportPreview {
  detected_columns: string[];
  mapping: Record<string, string>;
  mapping_candidates: Record<string, ImportFieldCandidate[]>;
  field_options: ImportFieldOption[];
  to_create: number;
  to_update: number;
  total_rows: number;
  row_errors: ImportRowError[];
  warnings: string[];
}

export interface VolunteerImportCommitResult {
  created: number;
  updated: number;
  total_processed: number;
  affected_ids: string[];
}

export const volunteerFieldSchema = z.object({
  skills: z.array(z.string().trim().min(1)).optional(),
  availability_status: z.enum(['available', 'unavailable', 'limited']).optional(),
  availability_notes: z.string().trim().optional().nullable(),
  background_check_status: z
    .enum(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired'])
    .optional()
    .nullable(),
  background_check_date: z.coerce.date().optional().nullable(),
  background_check_expiry: z.coerce.date().optional().nullable(),
  preferred_roles: z.array(z.string().trim().min(1)).optional(),
  certifications: z.array(z.string().trim().min(1)).optional(),
  max_hours_per_week: z.number().int().positive().optional().nullable(),
  emergency_contact_name: z.string().trim().optional().nullable(),
  emergency_contact_phone: z.string().trim().optional().nullable(),
  emergency_contact_relationship: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});
