import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { VolunteerFilters } from '@app-types/volunteer';
import {
  buildTabularExport,
  type GeneratedTabularFile,
  type TabularExportColumn,
} from '@modules/shared/export/tabularExport';
import { parsePeopleImportFile, type ImportFieldOption } from '@modules/shared/import/peopleImportParser';
import {
  findDuplicateMappedFields,
  getImportRowNumber,
  getMappedValue,
  hasAnyMappedValue,
  hasMappedField,
  parseBooleanLike,
  parseDelimitedList,
  parseNumberLike,
  toNullableString,
  toTrimmedString,
  type ImportRowError,
} from '@modules/shared/import/importUtils';
import { encrypt } from '@utils/encryption';
import { createContactSchema, updateContactSchema } from '@validations/contact';

type ExportableVolunteerRow = {
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

type VolunteerExportRequest = VolunteerFilters & {
  format: 'csv' | 'xlsx';
  ids?: string[];
  columns?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

type ParsedVolunteerImportRow = {
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

type VolunteerImportAction = {
  rowNumber: number;
  volunteerId?: string;
  contactId?: string;
  contactAction: 'create' | 'update' | 'none';
  volunteerAction: 'create' | 'update';
  contactPayload: ParsedVolunteerImportRow;
  volunteerPayload: ParsedVolunteerImportRow;
  resolvedAccountId?: string | null;
};

export interface VolunteerImportPreview {
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

export interface VolunteerImportCommitResult {
  created: number;
  updated: number;
  total_processed: number;
  affected_ids: string[];
}

const volunteerFieldSchema = z.object({
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

const VOLUNTEER_EXPORT_COLUMNS: Array<TabularExportColumn<ExportableVolunteerRow>> = [
  { key: 'volunteer_id', header: 'Volunteer ID', width: 38 },
  { key: 'contact_id', header: 'Contact ID', width: 38 },
  { key: 'account_id', header: 'Account ID', width: 38 },
  { key: 'account_number', header: 'Account Number', width: 18 },
  { key: 'account_name', header: 'Account Name', width: 24 },
  { key: 'first_name', header: 'First Name', width: 18 },
  { key: 'preferred_name', header: 'Preferred Name', width: 18 },
  { key: 'last_name', header: 'Last Name', width: 18 },
  { key: 'email', header: 'Email', width: 24 },
  { key: 'phone', header: 'Phone', width: 18 },
  { key: 'mobile_phone', header: 'Mobile Phone', width: 18 },
  { key: 'tags', header: 'Tags', width: 22, map: (row) => row.tags.join('; ') },
  { key: 'roles', header: 'Roles', width: 22, map: (row) => row.roles.join('; ') },
  { key: 'skills', header: 'Skills', width: 24, map: (row) => row.skills.join('; ') },
  { key: 'availability_status', header: 'Availability Status', width: 18 },
  { key: 'availability_notes', header: 'Availability Notes', width: 24 },
  { key: 'background_check_status', header: 'Background Check Status', width: 22 },
  { key: 'background_check_date', header: 'Background Check Date', width: 18 },
  { key: 'background_check_expiry', header: 'Background Check Expiry', width: 18 },
  { key: 'preferred_roles', header: 'Preferred Roles', width: 24, map: (row) => row.preferred_roles.join('; ') },
  { key: 'certifications', header: 'Certifications', width: 24, map: (row) => row.certifications.join('; ') },
  { key: 'max_hours_per_week', header: 'Max Hours Per Week', width: 18 },
  { key: 'emergency_contact_name', header: 'Emergency Contact Name', width: 24 },
  { key: 'emergency_contact_phone', header: 'Emergency Contact Phone', width: 20 },
  { key: 'emergency_contact_relationship', header: 'Emergency Contact Relationship', width: 24 },
  { key: 'volunteer_since', header: 'Volunteer Since', width: 16 },
  { key: 'total_hours_logged', header: 'Total Hours Logged', width: 18 },
  { key: 'is_active', header: 'Active', width: 12 },
  { key: 'created_at', header: 'Created At', width: 22 },
  { key: 'updated_at', header: 'Updated At', width: 22 },
];

const VOLUNTEER_TEMPLATE_COLUMNS = VOLUNTEER_EXPORT_COLUMNS.filter(
  (column) => !['account_name', 'created_at', 'updated_at', 'volunteer_since', 'total_hours_logged'].includes(column.key)
);

const VOLUNTEER_SORT_COLUMNS: Record<string, string> = {
  created_at: 'v.created_at',
  updated_at: 'v.updated_at',
  first_name: 'c.first_name',
  last_name: 'c.last_name',
  email: 'c.email',
  availability_status: 'v.availability_status',
  background_check_status: 'v.background_check_status',
};

const appendVolunteerScopeConditions = (
  conditions: string[],
  values: Array<string | boolean | string[]>,
  scope: DataScopeFilter | undefined,
  startingParameter: number
): number => {
  let parameter = startingParameter;

  if (scope?.accountIds?.length) {
    conditions.push(`c.account_id = ANY($${parameter}::uuid[])`);
    values.push(scope.accountIds);
    parameter += 1;
  }

  if (scope?.contactIds?.length) {
    conditions.push(`c.id = ANY($${parameter}::uuid[])`);
    values.push(scope.contactIds);
    parameter += 1;
  }

  if (scope?.createdByUserIds?.length) {
    conditions.push(`v.created_by = ANY($${parameter}::uuid[])`);
    values.push(scope.createdByUserIds);
    parameter += 1;
  }

  return parameter;
};

const buildVolunteerWhereClause = (
  organizationId: string,
  filters: Omit<VolunteerExportRequest, 'format' | 'columns' | 'sort_by' | 'sort_order'>,
  scope?: DataScopeFilter,
  ids?: string[]
): { clause: string; values: Array<string | boolean | string[]> } => {
  const conditions = ['c.account_id = $1'];
  const values: Array<string | boolean | string[]> = [organizationId];
  let parameter = 2;

  if (ids?.length) {
    conditions.push(`v.id = ANY($${parameter}::uuid[])`);
    values.push(ids);
    parameter += 1;
  } else {
    if (filters.search) {
      conditions.push(`(
        c.first_name ILIKE $${parameter}
        OR c.last_name ILIKE $${parameter}
        OR c.email ILIKE $${parameter}
        OR c.phone ILIKE $${parameter}
      )`);
      values.push(`%${filters.search}%`);
      parameter += 1;
    }

    if (filters.skills?.length) {
      conditions.push(`v.skills && $${parameter}::text[]`);
      values.push(filters.skills);
      parameter += 1;
    }

    if (filters.availability_status) {
      conditions.push(`v.availability_status = $${parameter}`);
      values.push(filters.availability_status);
      parameter += 1;
    }

    if (filters.background_check_status) {
      conditions.push(`v.background_check_status = $${parameter}`);
      values.push(filters.background_check_status);
      parameter += 1;
    }

    if (typeof filters.is_active === 'boolean') {
      conditions.push(`v.is_active = $${parameter}`);
      values.push(filters.is_active);
      parameter += 1;
    }
  }

  appendVolunteerScopeConditions(conditions, values, scope, parameter);

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
};

export class VolunteerImportExportUseCase {
  constructor(private readonly pool: Pool) {}

  async exportVolunteers(
    request: VolunteerExportRequest,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<GeneratedTabularFile> {
    const columns = this.resolveColumns(request.columns);
    const { clause, values } = buildVolunteerWhereClause(organizationId, request, scope, request.ids);
    const sortColumn =
      VOLUNTEER_SORT_COLUMNS[request.sort_by || ''] ?? VOLUNTEER_SORT_COLUMNS.last_name;
    const sortOrder = request.sort_order === 'desc' ? 'DESC' : 'ASC';

    const result = await this.pool.query<ExportableVolunteerRow>(
      `
        SELECT
          v.id AS volunteer_id,
          v.contact_id,
          c.account_id,
          a.account_number,
          a.account_name,
          c.first_name,
          c.preferred_name,
          c.last_name,
          c.email,
          c.phone,
          c.mobile_phone,
          COALESCE(c.tags, ARRAY[]::text[]) AS tags,
          COALESCE(
            ARRAY(
              SELECT cr.name
              FROM contact_role_assignments cra
              JOIN contact_roles cr ON cr.id = cra.role_id
              WHERE cra.contact_id = c.id
              ORDER BY cr.name
            ),
            ARRAY[]::text[]
          ) AS roles,
          COALESCE(v.skills, ARRAY[]::text[]) AS skills,
          v.availability_status,
          v.availability_notes,
          v.background_check_status,
          v.background_check_date::text AS background_check_date,
          v.background_check_expiry::text AS background_check_expiry,
          COALESCE(v.preferred_roles, ARRAY[]::text[]) AS preferred_roles,
          COALESCE(v.certifications, ARRAY[]::text[]) AS certifications,
          v.max_hours_per_week,
          v.emergency_contact_name,
          v.emergency_contact_phone,
          v.emergency_contact_relationship,
          v.volunteer_since::text AS volunteer_since,
          v.total_hours_logged,
          v.is_active,
          v.created_at,
          v.updated_at
        FROM volunteers v
        JOIN contacts c ON c.id = v.contact_id
        LEFT JOIN accounts a ON a.id = c.account_id
        ${clause}
        ORDER BY ${sortColumn} ${sortOrder}, v.id ASC
      `,
      values
    );

    return buildTabularExport({
      format: request.format,
      fallbackBaseName: `volunteers-export-${new Date().toISOString().split('T')[0]}`,
      sheets: [
        {
          name: 'Volunteers',
          columns,
          rows: result.rows,
        },
      ],
    });
  }

  async getImportTemplate(format: 'csv' | 'xlsx'): Promise<GeneratedTabularFile> {
    return buildTabularExport({
      format,
      fallbackBaseName: 'volunteers-import-template',
      sheets: [
        {
          name: 'Volunteers',
          columns: VOLUNTEER_TEMPLATE_COLUMNS,
          rows: [],
        },
      ],
    });
  }

  async previewImport(
    file: Express.Multer.File,
    mapping: Record<string, unknown> | undefined,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<VolunteerImportPreview> {
    const parsed = await parsePeopleImportFile(file, 'volunteers', mapping);
    const analysis = await this.analyzeImport(parsed, organizationId, scope);

    return {
      detected_columns: parsed.detectedColumns,
      mapping: parsed.mapping,
      mapping_candidates: parsed.mappingCandidates,
      field_options: parsed.fieldOptions,
      to_create: analysis.toCreate,
      to_update: analysis.toUpdate,
      total_rows: analysis.totalRows,
      row_errors: analysis.rowErrors,
      warnings: analysis.warnings,
    };
  }

  async commitImport(
    file: Express.Multer.File,
    mapping: Record<string, unknown> | undefined,
    userId: string,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<VolunteerImportCommitResult> {
    const parsed = await parsePeopleImportFile(file, 'volunteers', mapping);
    const analysis = await this.analyzeImport(parsed, organizationId, scope);

    if (analysis.rowErrors.length > 0) {
      throw Object.assign(new Error('Import preview contains validation errors'), {
        statusCode: 400,
        details: { row_errors: analysis.rowErrors },
      });
    }

    const client = await this.pool.connect();
    const affectedIds: string[] = [];
    let created = 0;
    let updated = 0;

    try {
      await client.query('BEGIN');

      for (const action of analysis.actions) {
        let contactId = action.contactId;

        if (action.contactAction === 'create') {
          contactId = await this.insertContact(client, action.contactPayload, action.resolvedAccountId ?? organizationId, userId);
          await this.syncRoles(client, contactId, action.contactPayload.roles ?? [], userId);
        } else if (action.contactAction === 'update' && contactId) {
          await this.updateContact(client, contactId, action.contactPayload, action.resolvedAccountId, userId);
          if (action.contactPayload.roles) {
            await this.syncRoles(client, contactId, action.contactPayload.roles, userId);
          }
        }

        if (!contactId) {
          throw new Error(`Missing contact context for volunteer import row ${action.rowNumber}`);
        }

        if (action.volunteerAction === 'create') {
          const volunteerId = await this.insertVolunteer(client, contactId, action.volunteerPayload, userId);
          affectedIds.push(volunteerId);
          created += 1;
        } else {
          const volunteerId = action.volunteerId;
          if (!volunteerId) {
            throw new Error(`Missing volunteer ID for update row ${action.rowNumber}`);
          }
          await this.updateVolunteer(client, volunteerId, action.volunteerPayload, userId);
          affectedIds.push(volunteerId);
          updated += 1;
        }
      }

      await client.query('COMMIT');
      return {
        created,
        updated,
        total_processed: created + updated,
        affected_ids: affectedIds,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private resolveColumns(requested?: string[]): Array<TabularExportColumn<ExportableVolunteerRow>> {
    const defaults = ['volunteer_id', 'contact_id', 'email'];
    const selected =
      requested && requested.length > 0
        ? Array.from(new Set([...defaults, ...requested]))
        : VOLUNTEER_EXPORT_COLUMNS.map((column) => column.key);

    return selected
      .map((key) => VOLUNTEER_EXPORT_COLUMNS.find((column) => column.key === key))
      .filter((column): column is TabularExportColumn<ExportableVolunteerRow> => Boolean(column));
  }

  private async analyzeImport(
    parsed: Awaited<ReturnType<typeof parsePeopleImportFile>>,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<{
    actions: VolunteerImportAction[];
    toCreate: number;
    toUpdate: number;
    totalRows: number;
    rowErrors: ImportRowError[];
    warnings: string[];
  }> {
    const rowErrors: ImportRowError[] = [];
    const warnings = [...parsed.warnings];
    const actions: VolunteerImportAction[] = [];

    const duplicateMappings = findDuplicateMappedFields(parsed.mapping);
    if (duplicateMappings.length > 0) {
      rowErrors.push({
        row_number: 0,
        messages: duplicateMappings.map((field) => `Multiple columns map to "${field}"`),
      });
    }

    const rows = parsed.rows.filter((row) => hasAnyMappedValue(row, parsed.mapping));
    const volunteerIds = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsed.mapping, 'volunteer_id')))
      .filter((value): value is string => Boolean(value));
    const contactIds = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsed.mapping, 'contact_id')))
      .filter((value): value is string => Boolean(value));
    const emails = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsed.mapping, 'email'))?.toLowerCase())
      .filter((value): value is string => Boolean(value));
    const accountIds = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsed.mapping, 'account_id')))
      .filter((value): value is string => Boolean(value));
    const accountNumbers = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsed.mapping, 'account_number')))
      .filter((value): value is string => Boolean(value));

    const identities = await this.lookupVolunteerIdentities(
      volunteerIds,
      contactIds,
      emails,
      organizationId,
      scope
    );
    const accountLookup = await this.lookupAccounts(accountIds, accountNumbers);
    const availableRoles = await this.lookupRoleNames();

    rows.forEach((row, rowIndex) => {
      const rowNumber = getImportRowNumber(parsed.dataset, rowIndex);
      const payload = this.mapRow(row, parsed.mapping);
      const messages: string[] = [];

      if (payload.roles) {
        const missingRoles = payload.roles.filter((role) => !availableRoles.has(role));
        if (missingRoles.length > 0) {
          messages.push(`Unknown contact role(s): ${missingRoles.join(', ')}`);
        }
      }

      const resolvedAccountId = this.resolveAccountReference(
        payload,
        accountLookup,
        organizationId,
        parsed.mapping,
        messages
      );

      let matchedVolunteerId: string | undefined;
      let matchedContactId: string | undefined;

      if (payload.volunteer_id) {
        const identity = identities.byVolunteerId.get(payload.volunteer_id);
        if (!identity) {
          messages.push(`Volunteer ID ${payload.volunteer_id} was not found in the active organization.`);
        } else {
          matchedVolunteerId = identity.volunteerId;
          matchedContactId = identity.contactId;
        }
      } else if (payload.contact_id) {
        const identity = identities.byContactId.get(payload.contact_id);
        if (!identity) {
          messages.push(`Contact ID ${payload.contact_id} was not found in the active organization.`);
        } else {
          matchedVolunteerId = identity.volunteerId;
          matchedContactId = identity.contactId;
        }
      } else if (payload.email) {
        const identitiesByEmail = identities.byEmail.get(payload.email.toLowerCase()) ?? [];
        if (identitiesByEmail.length > 1) {
          messages.push(`Email ${payload.email} matches multiple contacts in the active organization.`);
        } else if (identitiesByEmail.length === 1) {
          matchedVolunteerId = identitiesByEmail[0].volunteerId;
          matchedContactId = identitiesByEmail[0].contactId;
        }
      }

      const contactSchema = matchedContactId ? updateContactSchema : createContactSchema;
      const contactValidationPayload = {
        account_id: resolvedAccountId ?? organizationId,
        first_name: payload.first_name,
        preferred_name: payload.preferred_name,
        last_name: payload.last_name,
        middle_name: payload.middle_name,
        salutation: payload.salutation,
        suffix: payload.suffix,
        birth_date: payload.birth_date ?? undefined,
        gender: payload.gender,
        pronouns: payload.pronouns,
        phn: payload.phn,
        email: payload.email,
        phone: payload.phone,
        mobile_phone: payload.mobile_phone,
        address_line1: payload.address_line1,
        address_line2: payload.address_line2,
        city: payload.city,
        state_province: payload.state_province,
        postal_code: payload.postal_code,
        country: payload.country,
        no_fixed_address: payload.no_fixed_address,
        job_title: payload.job_title,
        department: payload.department,
        preferred_contact_method: payload.preferred_contact_method,
        do_not_email: payload.do_not_email,
        do_not_phone: payload.do_not_phone,
        do_not_text: payload.do_not_text,
        do_not_voicemail: payload.do_not_voicemail,
        notes: payload.notes,
        tags: payload.tags,
        roles: payload.roles,
        is_active: payload.is_active,
      };
      const contactValidation = contactSchema.safeParse(contactValidationPayload);
      if (!contactValidation.success) {
        messages.push(...contactValidation.error.issues.map((issue) => issue.message));
      }

      const volunteerValidation = volunteerFieldSchema.safeParse({
        skills: payload.skills,
        availability_status: payload.availability_status,
        availability_notes: payload.availability_notes,
        background_check_status: payload.background_check_status,
        background_check_date: payload.background_check_date ?? undefined,
        background_check_expiry: payload.background_check_expiry ?? undefined,
        preferred_roles: payload.preferred_roles,
        certifications: payload.certifications,
        max_hours_per_week: payload.max_hours_per_week,
        emergency_contact_name: payload.emergency_contact_name,
        emergency_contact_phone: payload.emergency_contact_phone,
        emergency_contact_relationship: payload.emergency_contact_relationship,
        is_active: payload.is_active,
      });
      if (!volunteerValidation.success) {
        messages.push(...volunteerValidation.error.issues.map((issue) => issue.message));
      }

      if (messages.length > 0) {
        rowErrors.push({ row_number: rowNumber, messages });
        return;
      }

      if (!contactValidation.success || !volunteerValidation.success) {
        return;
      }

      actions.push({
        rowNumber,
        volunteerId: matchedVolunteerId,
        contactId: matchedContactId,
        contactAction: matchedContactId ? 'update' : 'create',
        volunteerAction: matchedVolunteerId ? 'update' : 'create',
        contactPayload: contactValidation.data as ParsedVolunteerImportRow,
        volunteerPayload: volunteerValidation.data as ParsedVolunteerImportRow,
        resolvedAccountId,
      });
    });

    return {
      actions,
      toCreate: actions.filter((action) => action.volunteerAction === 'create').length,
      toUpdate: actions.filter((action) => action.volunteerAction === 'update').length,
      totalRows: rows.length,
      rowErrors,
      warnings,
    };
  }

  private mapRow(
    row: Record<string, string | null>,
    mapping: Record<string, string>
  ): ParsedVolunteerImportRow {
    const parseArrayField = (
      field: 'tags' | 'roles' | 'skills' | 'preferred_roles' | 'certifications'
    ): string[] | undefined => {
      if (!hasMappedField(mapping, field)) {
        return undefined;
      }

      const value = getMappedValue(row, mapping, field);
      return value === null ? [] : parseDelimitedList(value);
    };

    const normalizeAvailability = (
      value: string | null | undefined
    ): ParsedVolunteerImportRow['availability_status'] => {
      const normalized = toTrimmedString(value)?.toLowerCase();
      return normalized === 'available' || normalized === 'unavailable' || normalized === 'limited'
        ? normalized
        : undefined;
    };

    const normalizeBackgroundStatus = (
      value: string | null | undefined
    ): ParsedVolunteerImportRow['background_check_status'] => {
      const normalized = toTrimmedString(value)?.toLowerCase();
      return volunteerFieldSchema.shape.background_check_status.safeParse(normalized).success
        ? (normalized as ParsedVolunteerImportRow['background_check_status'])
        : undefined;
    };

    return {
      volunteer_id: toTrimmedString(getMappedValue(row, mapping, 'volunteer_id')),
      contact_id: toTrimmedString(getMappedValue(row, mapping, 'contact_id')),
      account_id: toNullableString(getMappedValue(row, mapping, 'account_id')),
      account_number: toNullableString(getMappedValue(row, mapping, 'account_number')),
      first_name: toNullableString(getMappedValue(row, mapping, 'first_name')),
      preferred_name: toNullableString(getMappedValue(row, mapping, 'preferred_name')),
      last_name: toNullableString(getMappedValue(row, mapping, 'last_name')),
      middle_name: toNullableString(getMappedValue(row, mapping, 'middle_name')),
      salutation: toNullableString(getMappedValue(row, mapping, 'salutation')),
      suffix: toNullableString(getMappedValue(row, mapping, 'suffix')),
      birth_date: toNullableString(getMappedValue(row, mapping, 'birth_date')),
      gender: toNullableString(getMappedValue(row, mapping, 'gender')),
      pronouns: toNullableString(getMappedValue(row, mapping, 'pronouns')),
      phn: toNullableString(getMappedValue(row, mapping, 'phn')),
      email: toNullableString(getMappedValue(row, mapping, 'email')),
      phone: toNullableString(getMappedValue(row, mapping, 'phone')),
      mobile_phone: toNullableString(getMappedValue(row, mapping, 'mobile_phone')),
      address_line1: toNullableString(getMappedValue(row, mapping, 'address_line1')),
      address_line2: toNullableString(getMappedValue(row, mapping, 'address_line2')),
      city: toNullableString(getMappedValue(row, mapping, 'city')),
      state_province: toNullableString(getMappedValue(row, mapping, 'state_province')),
      postal_code: toNullableString(getMappedValue(row, mapping, 'postal_code')),
      country: toNullableString(getMappedValue(row, mapping, 'country')),
      no_fixed_address: parseBooleanLike(getMappedValue(row, mapping, 'no_fixed_address')),
      job_title: toNullableString(getMappedValue(row, mapping, 'job_title')),
      department: toNullableString(getMappedValue(row, mapping, 'department')),
      preferred_contact_method: toNullableString(getMappedValue(row, mapping, 'preferred_contact_method')),
      do_not_email: parseBooleanLike(getMappedValue(row, mapping, 'do_not_email')),
      do_not_phone: parseBooleanLike(getMappedValue(row, mapping, 'do_not_phone')),
      do_not_text: parseBooleanLike(getMappedValue(row, mapping, 'do_not_text')),
      do_not_voicemail: parseBooleanLike(getMappedValue(row, mapping, 'do_not_voicemail')),
      notes: toNullableString(getMappedValue(row, mapping, 'notes')),
      tags: parseArrayField('tags'),
      roles: parseArrayField('roles'),
      skills: parseArrayField('skills'),
      availability_status: normalizeAvailability(getMappedValue(row, mapping, 'availability_status')),
      availability_notes: toNullableString(getMappedValue(row, mapping, 'availability_notes')),
      background_check_status: normalizeBackgroundStatus(
        getMappedValue(row, mapping, 'background_check_status')
      ),
      background_check_date: toNullableString(getMappedValue(row, mapping, 'background_check_date')),
      background_check_expiry: toNullableString(getMappedValue(row, mapping, 'background_check_expiry')),
      preferred_roles: parseArrayField('preferred_roles'),
      certifications: parseArrayField('certifications'),
      max_hours_per_week: (() => {
        const value = getMappedValue(row, mapping, 'max_hours_per_week');
        if (value === null && hasMappedField(mapping, 'max_hours_per_week')) {
          return null;
        }
        const parsedValue = parseNumberLike(value);
        return parsedValue ?? undefined;
      })(),
      emergency_contact_name: toNullableString(getMappedValue(row, mapping, 'emergency_contact_name')),
      emergency_contact_phone: toNullableString(getMappedValue(row, mapping, 'emergency_contact_phone')),
      emergency_contact_relationship: toNullableString(
        getMappedValue(row, mapping, 'emergency_contact_relationship')
      ),
      is_active: parseBooleanLike(getMappedValue(row, mapping, 'is_active')),
    };
  }

  private resolveAccountReference(
    payload: ParsedVolunteerImportRow,
    accountLookup: { byId: Map<string, string>; byNumber: Map<string, string> },
    organizationId: string,
    mapping: Record<string, string>,
    messages: string[]
  ): string | null | undefined {
    const accountIdWasMapped = hasMappedField(mapping, 'account_id');
    const accountNumberWasMapped = hasMappedField(mapping, 'account_number');

    if (!accountIdWasMapped && !accountNumberWasMapped) {
      return undefined;
    }

    let resolvedFromId: string | undefined;
    let resolvedFromNumber: string | undefined;

    if (payload.account_id) {
      resolvedFromId = accountLookup.byId.get(payload.account_id);
      if (!resolvedFromId) {
        messages.push(`Account ID ${payload.account_id} was not found.`);
      }
    } else if (accountIdWasMapped) {
      return null;
    }

    if (payload.account_number) {
      resolvedFromNumber = accountLookup.byNumber.get(payload.account_number);
      if (!resolvedFromNumber) {
        messages.push(`Account number ${payload.account_number} was not found.`);
      }
    }

    if (resolvedFromId && resolvedFromNumber && resolvedFromId !== resolvedFromNumber) {
      messages.push('Account ID and account number reference different accounts.');
      return undefined;
    }

    return resolvedFromId ?? resolvedFromNumber ?? organizationId;
  }

  private async lookupVolunteerIdentities(
    volunteerIds: string[],
    contactIds: string[],
    emails: string[],
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<{
    byVolunteerId: Map<string, { volunteerId?: string; contactId: string }>;
    byContactId: Map<string, { volunteerId?: string; contactId: string }>;
    byEmail: Map<string, Array<{ volunteerId?: string; contactId: string }>>;
  }> {
    if (volunteerIds.length === 0 && contactIds.length === 0 && emails.length === 0) {
      return {
        byVolunteerId: new Map(),
        byContactId: new Map(),
        byEmail: new Map(),
      };
    }

    const conditions = ['c.account_id = $1'];
    const values: Array<string | string[]> = [organizationId];
    let parameter = 2;

    const identityConditions: string[] = [];
    if (volunteerIds.length) {
      identityConditions.push(`v.id = ANY($${parameter}::uuid[])`);
      values.push(volunteerIds);
      parameter += 1;
    }
    if (contactIds.length) {
      identityConditions.push(`c.id = ANY($${parameter}::uuid[])`);
      values.push(contactIds);
      parameter += 1;
    }
    if (emails.length) {
      identityConditions.push(`LOWER(c.email) = ANY($${parameter}::text[])`);
      values.push(emails);
      parameter += 1;
    }

    conditions.push(`(${identityConditions.join(' OR ')})`);
    appendVolunteerScopeConditions(conditions, values as Array<string | boolean | string[]>, scope, parameter);

    const result = await this.pool.query<{
      volunteer_id: string | null;
      contact_id: string;
      email: string | null;
    }>(
      `
        SELECT
          v.id AS volunteer_id,
          c.id AS contact_id,
          c.email
        FROM contacts c
        LEFT JOIN volunteers v ON v.contact_id = c.id
        WHERE ${conditions.join(' AND ')}
      `,
      values
    );

    const byVolunteerId = new Map<string, { volunteerId?: string; contactId: string }>();
    const byContactId = new Map<string, { volunteerId?: string; contactId: string }>();
    const byEmail = new Map<string, Array<{ volunteerId?: string; contactId: string }>>();

    result.rows.forEach((row) => {
      const identity = {
        ...(row.volunteer_id ? { volunteerId: row.volunteer_id } : {}),
        contactId: row.contact_id,
      };

      if (row.volunteer_id) {
        byVolunteerId.set(row.volunteer_id, identity);
      }
      byContactId.set(row.contact_id, identity);
      if (row.email) {
        const key = row.email.toLowerCase();
        const current = byEmail.get(key) ?? [];
        current.push(identity);
        byEmail.set(key, current);
      }
    });

    return {
      byVolunteerId,
      byContactId,
      byEmail,
    };
  }

  private async lookupAccounts(
    accountIds: string[],
    accountNumbers: string[]
  ): Promise<{
    byId: Map<string, string>;
    byNumber: Map<string, string>;
  }> {
    if (accountIds.length === 0 && accountNumbers.length === 0) {
      return { byId: new Map(), byNumber: new Map() };
    }

    const conditions: string[] = [];
    const values: Array<string[] | string> = [];
    let parameter = 1;

    if (accountIds.length) {
      conditions.push(`id = ANY($${parameter}::uuid[])`);
      values.push(accountIds);
      parameter += 1;
    }

    if (accountNumbers.length) {
      conditions.push(`account_number = ANY($${parameter}::text[])`);
      values.push(accountNumbers);
    }

    const result = await this.pool.query<{ account_id: string; account_number: string | null }>(
      `
        SELECT id AS account_id, account_number
        FROM accounts
        WHERE ${conditions.join(' OR ')}
      `,
      values
    );

    return {
      byId: new Map(result.rows.map((row) => [row.account_id, row.account_id])),
      byNumber: new Map(
        result.rows
          .filter((row) => Boolean(row.account_number))
          .map((row) => [row.account_number as string, row.account_id])
      ),
    };
  }

  private async lookupRoleNames(): Promise<Set<string>> {
    const result = await this.pool.query<{ name: string }>('SELECT name FROM contact_roles');
    return new Set(result.rows.map((row) => row.name));
  }

  private async insertContact(
    client: PoolClient,
    payload: ParsedVolunteerImportRow,
    accountId: string | null,
    userId: string
  ): Promise<string> {
    const result = await client.query<{ contact_id: string }>(
      `
        INSERT INTO contacts (
          account_id,
          first_name,
          preferred_name,
          last_name,
          middle_name,
          salutation,
          suffix,
          birth_date,
          gender,
          pronouns,
          phn_encrypted,
          email,
          phone,
          mobile_phone,
          address_line1,
          address_line2,
          city,
          state_province,
          postal_code,
          country,
          no_fixed_address,
          job_title,
          department,
          preferred_contact_method,
          do_not_email,
          do_not_phone,
          do_not_text,
          do_not_voicemail,
          notes,
          tags,
          is_active,
          created_by,
          modified_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, COALESCE($21, false), $22, $23, $24, COALESCE($25, false), COALESCE($26, false),
          COALESCE($27, false), COALESCE($28, false), $29, COALESCE($30, ARRAY[]::text[]), COALESCE($31, true), $32, $32
        )
        RETURNING id AS contact_id
      `,
      [
        accountId,
        payload.first_name,
        payload.preferred_name,
        payload.last_name,
        payload.middle_name,
        payload.salutation,
        payload.suffix,
        payload.birth_date,
        payload.gender,
        payload.pronouns,
        payload.phn ? encrypt(payload.phn) : null,
        payload.email,
        payload.phone,
        payload.mobile_phone,
        payload.address_line1,
        payload.address_line2,
        payload.city,
        payload.state_province,
        payload.postal_code,
        payload.country,
        payload.no_fixed_address,
        payload.job_title,
        payload.department,
        payload.preferred_contact_method,
        payload.do_not_email,
        payload.do_not_phone,
        payload.do_not_text,
        payload.do_not_voicemail,
        payload.notes,
        payload.tags,
        payload.is_active,
        userId,
      ]
    );

    return result.rows[0].contact_id;
  }

  private async updateContact(
    client: PoolClient,
    contactId: string,
    payload: ParsedVolunteerImportRow,
    resolvedAccountId: string | null | undefined,
    userId: string
  ): Promise<void> {
    const updates: string[] = [];
    const values: Array<string | boolean | string[] | Date | null> = [];
    let parameter = 1;

    const setField = (
      field: string,
      value: string | boolean | string[] | Date | null | undefined
    ): void => {
      if (value === undefined) {
        return;
      }
      updates.push(`${field} = $${parameter}`);
      values.push(value);
      parameter += 1;
    };

    if (resolvedAccountId !== undefined) {
      setField('account_id', resolvedAccountId);
    }

    setField('first_name', payload.first_name);
    setField('preferred_name', payload.preferred_name);
    setField('last_name', payload.last_name);
    setField('middle_name', payload.middle_name);
    setField('salutation', payload.salutation);
    setField('suffix', payload.suffix);
    if (payload.birth_date !== undefined) {
      updates.push(`birth_date = $${parameter}::date`);
      values.push(payload.birth_date as string | null);
      parameter += 1;
    }
    setField('gender', payload.gender);
    setField('pronouns', payload.pronouns);
    if (payload.phn !== undefined) {
      setField('phn_encrypted', payload.phn ? encrypt(payload.phn) : null);
    }
    setField('email', payload.email);
    setField('phone', payload.phone);
    setField('mobile_phone', payload.mobile_phone);
    setField('address_line1', payload.address_line1);
    setField('address_line2', payload.address_line2);
    setField('city', payload.city);
    setField('state_province', payload.state_province);
    setField('postal_code', payload.postal_code);
    setField('country', payload.country);
    setField('no_fixed_address', payload.no_fixed_address);
    setField('job_title', payload.job_title);
    setField('department', payload.department);
    setField('preferred_contact_method', payload.preferred_contact_method);
    setField('do_not_email', payload.do_not_email);
    setField('do_not_phone', payload.do_not_phone);
    setField('do_not_text', payload.do_not_text);
    setField('do_not_voicemail', payload.do_not_voicemail);
    setField('notes', payload.notes);
    setField('tags', payload.tags);
    setField('is_active', payload.is_active);

    if (updates.length === 0) {
      return;
    }

    updates.push(`modified_by = $${parameter}`);
    values.push(userId);
    parameter += 1;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(contactId);

    await client.query(
      `
        UPDATE contacts
        SET ${updates.join(', ')}
        WHERE id = $${parameter}
      `,
      values
    );
  }

  private async insertVolunteer(
    client: PoolClient,
    contactId: string,
    payload: ParsedVolunteerImportRow,
    userId: string
  ): Promise<string> {
    const availabilityStatus = payload.availability_status ?? 'available';
    const totalHours = payload.max_hours_per_week === null ? 0 : 0;
    void totalHours;

    const result = await client.query<{ volunteer_id: string }>(
      `
        INSERT INTO volunteers (
          contact_id,
          volunteer_status,
          skills,
          availability,
          emergency_contact_name,
          emergency_contact_phone,
          background_check_date,
          background_check_status,
          hours_contributed,
          availability_status,
          availability_notes,
          background_check_expiry,
          preferred_roles,
          certifications,
          max_hours_per_week,
          emergency_contact_relationship,
          volunteer_since,
          total_hours_logged,
          is_active,
          created_by,
          modified_by
        ) VALUES (
          $1, $2, COALESCE($3, ARRAY[]::text[]), $4, $5, $6, $7::date, $8, COALESCE($9, 0),
          $10, $11, $12::date, COALESCE($13, ARRAY[]::text[]), COALESCE($14, ARRAY[]::text[]),
          $15, $16, CURRENT_DATE, COALESCE($9, 0), COALESCE($17, true), $18, $18
        )
        RETURNING id AS volunteer_id
      `,
      [
        contactId,
        availabilityStatus,
        payload.skills,
        payload.availability_notes,
        payload.emergency_contact_name,
        payload.emergency_contact_phone,
        payload.background_check_date,
        payload.background_check_status,
        0,
        availabilityStatus,
        payload.availability_notes,
        payload.background_check_expiry,
        payload.preferred_roles,
        payload.certifications,
        payload.max_hours_per_week,
        payload.emergency_contact_relationship,
        payload.is_active,
        userId,
      ]
    );

    return result.rows[0].volunteer_id;
  }

  private async updateVolunteer(
    client: PoolClient,
    volunteerId: string,
    payload: ParsedVolunteerImportRow,
    userId: string
  ): Promise<void> {
    const updates: string[] = [];
    const values: Array<string | boolean | string[] | number | Date | null> = [];
    let parameter = 1;

    const setField = (
      field: string,
      value: string | boolean | string[] | number | Date | null | undefined
    ): void => {
      if (value === undefined) {
        return;
      }
      updates.push(`${field} = $${parameter}`);
      values.push(value);
      parameter += 1;
    };

    if (payload.availability_status !== undefined) {
      setField('volunteer_status', payload.availability_status);
      setField('availability_status', payload.availability_status);
    }
    setField('skills', payload.skills);
    setField('availability', payload.availability_notes);
    setField('availability_notes', payload.availability_notes);
    if (payload.background_check_date !== undefined) {
      updates.push(`background_check_date = $${parameter}::date`);
      values.push(payload.background_check_date as string | null);
      parameter += 1;
    }
    setField('background_check_status', payload.background_check_status);
    if (payload.background_check_expiry !== undefined) {
      updates.push(`background_check_expiry = $${parameter}::date`);
      values.push(payload.background_check_expiry as string | null);
      parameter += 1;
    }
    setField('preferred_roles', payload.preferred_roles);
    setField('certifications', payload.certifications);
    setField('max_hours_per_week', payload.max_hours_per_week);
    setField('emergency_contact_name', payload.emergency_contact_name);
    setField('emergency_contact_phone', payload.emergency_contact_phone);
    setField('emergency_contact_relationship', payload.emergency_contact_relationship);
    setField('is_active', payload.is_active);

    if (updates.length === 0) {
      return;
    }

    updates.push(`modified_by = $${parameter}`);
    values.push(userId);
    parameter += 1;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(volunteerId);

    await client.query(
      `
        UPDATE volunteers
        SET ${updates.join(', ')}
        WHERE id = $${parameter}
      `,
      values
    );
  }

  private async syncRoles(
    client: PoolClient,
    contactId: string,
    roles: string[],
    userId: string
  ): Promise<void> {
    await client.query('DELETE FROM contact_role_assignments WHERE contact_id = $1', [contactId]);

    if (roles.length === 0) {
      return;
    }

    const roleResult = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM contact_roles WHERE name = ANY($1::text[])`,
      [roles]
    );

    if (roleResult.rows.length !== roles.length) {
      const found = new Set(roleResult.rows.map((row) => row.name));
      const missing = roles.filter((role) => !found.has(role));
      throw new Error(`Unknown contact role(s): ${missing.join(', ')}`);
    }

    const insertValues: string[] = [];
    const params: string[] = [];
    roleResult.rows.forEach((role, index) => {
      const base = index * 3;
      insertValues.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      params.push(contactId, role.id, userId);
    });

    await client.query(
      `
        INSERT INTO contact_role_assignments (contact_id, role_id, assigned_by)
        VALUES ${insertValues.join(', ')}
      `,
      params
    );
  }
}

export default VolunteerImportExportUseCase;
