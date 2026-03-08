import { Pool, type PoolClient } from 'pg';
import type { ContactFilters } from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
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
  toNullableString,
  toTrimmedString,
  type ImportRowError,
} from '@modules/shared/import/importUtils';
import { encrypt } from '@utils/encryption';
import { createContactSchema, updateContactSchema } from '@validations/contact';

type ExportableContactRow = {
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

type ContactExportRequest = ContactFilters & {
  format: 'csv' | 'xlsx';
  ids?: string[];
  columns?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

type ParsedContactRow = {
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

type ContactImportAction =
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

const CONTACT_EXPORT_COLUMNS: Array<TabularExportColumn<ExportableContactRow>> = [
  { key: 'contact_id', header: 'Contact ID', width: 38 },
  { key: 'account_id', header: 'Account ID', width: 38 },
  { key: 'account_number', header: 'Account Number', width: 18 },
  { key: 'account_name', header: 'Account Name', width: 24 },
  { key: 'first_name', header: 'First Name', width: 18 },
  { key: 'preferred_name', header: 'Preferred Name', width: 18 },
  { key: 'last_name', header: 'Last Name', width: 18 },
  { key: 'middle_name', header: 'Middle Name', width: 18 },
  { key: 'salutation', header: 'Salutation', width: 14 },
  { key: 'suffix', header: 'Suffix', width: 14 },
  { key: 'birth_date', header: 'Birth Date', width: 16 },
  { key: 'gender', header: 'Gender', width: 14 },
  { key: 'pronouns', header: 'Pronouns', width: 14 },
  { key: 'phn', header: 'PHN', width: 16 },
  { key: 'email', header: 'Email', width: 24 },
  { key: 'phone', header: 'Phone', width: 18 },
  { key: 'mobile_phone', header: 'Mobile Phone', width: 18 },
  { key: 'job_title', header: 'Job Title', width: 20 },
  { key: 'department', header: 'Department', width: 20 },
  { key: 'preferred_contact_method', header: 'Preferred Contact Method', width: 22 },
  { key: 'do_not_email', header: 'Do Not Email', width: 14 },
  { key: 'do_not_phone', header: 'Do Not Phone', width: 14 },
  { key: 'do_not_text', header: 'Do Not Text', width: 14 },
  { key: 'do_not_voicemail', header: 'Do Not Voicemail', width: 16 },
  { key: 'address_line1', header: 'Address Line 1', width: 24 },
  { key: 'address_line2', header: 'Address Line 2', width: 24 },
  { key: 'city', header: 'City', width: 18 },
  { key: 'state_province', header: 'State / Province', width: 18 },
  { key: 'postal_code', header: 'Postal Code', width: 16 },
  { key: 'country', header: 'Country', width: 18 },
  { key: 'no_fixed_address', header: 'No Fixed Address', width: 18 },
  { key: 'notes', header: 'Notes', width: 36 },
  {
    key: 'tags',
    header: 'Tags',
    width: 24,
    map: (row) => row.tags.join('; '),
  },
  {
    key: 'roles',
    header: 'Roles',
    width: 24,
    map: (row) => row.roles.join('; '),
  },
  { key: 'is_active', header: 'Active', width: 12 },
  { key: 'created_at', header: 'Created At', width: 22 },
  { key: 'updated_at', header: 'Updated At', width: 22 },
];

const CONTACT_TEMPLATE_COLUMNS = CONTACT_EXPORT_COLUMNS.filter(
  (column) => !['account_name', 'created_at', 'updated_at'].includes(column.key)
);

const CONTACT_SORT_COLUMNS: Record<string, string> = {
  created_at: 'c.created_at',
  updated_at: 'c.updated_at',
  first_name: 'c.first_name',
  last_name: 'c.last_name',
  email: 'c.email',
  account_name: 'a.account_name',
};

const appendContactScopeConditions = (
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
    conditions.push(`c.created_by = ANY($${parameter}::uuid[])`);
    values.push(scope.createdByUserIds);
    parameter += 1;
  }

  return parameter;
};

const buildContactWhereClause = (
  organizationId: string,
  filters: Omit<ContactExportRequest, 'format' | 'columns' | 'sort_by' | 'sort_order'>,
  scope?: DataScopeFilter,
  ids?: string[]
): { clause: string; values: Array<string | boolean | string[]> } => {
  const conditions = ['c.account_id = $1'];
  const values: Array<string | boolean | string[]> = [organizationId];
  let parameter = 2;

  if (ids?.length) {
    conditions.push(`c.id = ANY($${parameter}::uuid[])`);
    values.push(ids);
    parameter += 1;
  } else {
    if (filters.search) {
      conditions.push(`(
        c.first_name ILIKE $${parameter}
        OR c.preferred_name ILIKE $${parameter}
        OR c.last_name ILIKE $${parameter}
        OR c.email ILIKE $${parameter}
        OR c.phone ILIKE $${parameter}
        OR c.mobile_phone ILIKE $${parameter}
      )`);
      values.push(`%${filters.search}%`);
      parameter += 1;
    }

    if (filters.role) {
      const roleNames =
        filters.role === 'staff'
          ? ['Staff', 'Executive Director']
          : filters.role === 'volunteer'
            ? ['Volunteer']
            : ['Board Member'];

      conditions.push(`EXISTS (
        SELECT 1
        FROM contact_role_assignments cra
        JOIN contact_roles cr ON cr.id = cra.role_id
        WHERE cra.contact_id = c.id
          AND cr.name = ANY($${parameter}::text[])
      )`);
      values.push(roleNames);
      parameter += 1;
    }

    if (filters.account_id) {
      conditions.push(`c.account_id = $${parameter}`);
      values.push(filters.account_id);
      parameter += 1;
    }

    if (typeof filters.is_active === 'boolean') {
      conditions.push(`c.is_active = $${parameter}`);
      values.push(filters.is_active);
      parameter += 1;
    }

    if (filters.tags?.length) {
      conditions.push(`c.tags && $${parameter}::text[]`);
      values.push(filters.tags);
      parameter += 1;
    }
  }

  appendContactScopeConditions(conditions, values, scope, parameter);

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
};

export class ContactImportExportUseCase {
  constructor(private readonly pool: Pool) {}

  async exportContacts(
    request: ContactExportRequest,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<GeneratedTabularFile> {
    const columns = this.resolveColumns(request.columns);
    const { clause, values } = buildContactWhereClause(organizationId, request, scope, request.ids);
    const sortColumn = CONTACT_SORT_COLUMNS[request.sort_by || ''] ?? CONTACT_SORT_COLUMNS.last_name;
    const sortOrder = request.sort_order === 'desc' ? 'DESC' : 'ASC';

    const result = await this.pool.query<ExportableContactRow>(
      `
        SELECT
          c.id AS contact_id,
          c.account_id,
          a.account_number,
          a.account_name,
          c.first_name,
          c.preferred_name,
          c.last_name,
          c.middle_name,
          c.salutation,
          c.suffix,
          c.birth_date::text AS birth_date,
          c.gender,
          c.pronouns,
          NULL::text AS phn,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.department,
          c.preferred_contact_method,
          c.do_not_email,
          c.do_not_phone,
          c.do_not_text,
          c.do_not_voicemail,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.no_fixed_address,
          c.notes,
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
          c.is_active,
          c.created_at,
          c.updated_at
        FROM contacts c
        LEFT JOIN accounts a ON a.id = c.account_id
        ${clause}
        ORDER BY ${sortColumn} ${sortOrder}, c.id ASC
      `,
      values
    );

    return buildTabularExport({
      format: request.format,
      fallbackBaseName: `contacts-export-${new Date().toISOString().split('T')[0]}`,
      sheets: [
        {
          name: 'Contacts',
          columns,
          rows: result.rows,
        },
      ],
    });
  }

  async getImportTemplate(format: 'csv' | 'xlsx'): Promise<GeneratedTabularFile> {
    return buildTabularExport({
      format,
      fallbackBaseName: 'contacts-import-template',
      sheets: [
        {
          name: 'Contacts',
          columns: CONTACT_TEMPLATE_COLUMNS,
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
  ): Promise<ContactImportPreview> {
    const parsed = await parsePeopleImportFile(file, 'contacts', mapping);
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
  ): Promise<ContactImportCommitResult> {
    const parsed = await parsePeopleImportFile(file, 'contacts', mapping);
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
        if (action.action === 'create') {
          const contactId = await this.insertContact(
            client,
            action.payload,
            action.resolvedAccountId,
            userId
          );
          await this.syncRoles(client, contactId, action.payload.roles ?? [], userId);
          affectedIds.push(contactId);
          created += 1;
          continue;
        }

        await this.updateContact(client, action.contactId, action.payload, action.resolvedAccountId, userId);
        if (action.payload.roles) {
          await this.syncRoles(client, action.contactId, action.payload.roles, userId);
        }
        affectedIds.push(action.contactId);
        updated += 1;
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

  private resolveColumns(requested?: string[]): Array<TabularExportColumn<ExportableContactRow>> {
    const defaults = ['contact_id', 'email'];
    const selected =
      requested && requested.length > 0
        ? Array.from(new Set([...defaults, ...requested]))
        : CONTACT_EXPORT_COLUMNS.map((column) => column.key);

    return selected
      .map((key) => CONTACT_EXPORT_COLUMNS.find((column) => column.key === key))
      .filter((column): column is TabularExportColumn<ExportableContactRow> => Boolean(column));
  }

  private async analyzeImport(
    parsed: Awaited<ReturnType<typeof parsePeopleImportFile>>,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<{
    actions: ContactImportAction[];
    toCreate: number;
    toUpdate: number;
    totalRows: number;
    rowErrors: ImportRowError[];
    warnings: string[];
  }> {
    const rowErrors: ImportRowError[] = [];
    const warnings = [...parsed.warnings];
    const actions: ContactImportAction[] = [];

    const duplicateMappings = findDuplicateMappedFields(parsed.mapping);
    if (duplicateMappings.length > 0) {
      rowErrors.push({
        row_number: 0,
        messages: duplicateMappings.map((field) => `Multiple columns map to "${field}"`),
      });
    }

    const rows = parsed.rows.filter((row) => hasAnyMappedValue(row, parsed.mapping));
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

    const existingContacts = await this.lookupExistingContacts(contactIds, emails, organizationId, scope);
    const accountLookup = await this.lookupAccounts(accountIds, accountNumbers, scope);
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

      const resolvedAccount = this.resolveAccountReference(
        payload,
        accountLookup,
        organizationId,
        parsed.mapping,
        messages
      );

      let matchedContactId: string | undefined;
      if (payload.contact_id) {
        matchedContactId = existingContacts.byId.get(payload.contact_id);
        if (!matchedContactId) {
          messages.push(`Contact ID ${payload.contact_id} was not found in the active organization.`);
        }
      } else if (payload.email) {
        const matches = existingContacts.byEmail.get(payload.email.toLowerCase()) ?? [];
        if (matches.length > 1) {
          messages.push(`Email ${payload.email} matches multiple contacts in the active organization.`);
        } else if (matches.length === 1) {
          matchedContactId = matches[0];
        }
      }

      const schema = matchedContactId ? updateContactSchema : createContactSchema;
      const validationPayload = {
        ...payload,
        ...(resolvedAccount !== undefined ? { account_id: resolvedAccount } : {}),
      };
      const validation = schema.safeParse(validationPayload);
      if (!validation.success) {
        messages.push(...validation.error.issues.map((issue) => issue.message));
      }

      if (messages.length > 0) {
        rowErrors.push({ row_number: rowNumber, messages });
        return;
      }

      if (!validation.success) {
        return;
      }

      const validatedPayload = validation.data as ParsedContactRow;

      if (matchedContactId) {
        actions.push({
          action: 'update',
          rowNumber,
          contactId: matchedContactId,
          payload: validatedPayload,
          ...(resolvedAccount !== undefined ? { resolvedAccountId: resolvedAccount } : {}),
        });
      } else {
        actions.push({
          action: 'create',
          rowNumber,
          payload: validatedPayload,
          resolvedAccountId: resolvedAccount ?? organizationId,
        });
      }
    });

    return {
      actions,
      toCreate: actions.filter((action) => action.action === 'create').length,
      toUpdate: actions.filter((action) => action.action === 'update').length,
      totalRows: rows.length,
      rowErrors,
      warnings,
    };
  }

  private mapRow(
    row: Record<string, string | null>,
    mapping: Record<string, string>
  ): ParsedContactRow {
    const parseArrayField = (field: 'tags' | 'roles'): string[] | undefined => {
      if (!hasMappedField(mapping, field)) {
        return undefined;
      }

      const value = getMappedValue(row, mapping, field);
      return value === null ? [] : parseDelimitedList(value);
    };

    return {
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
      is_active: parseBooleanLike(getMappedValue(row, mapping, 'is_active')),
    };
  }

  private resolveAccountReference(
    payload: ParsedContactRow,
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

  private async lookupExistingContacts(
    contactIds: string[],
    emails: string[],
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<{
    byId: Map<string, string>;
    byEmail: Map<string, string[]>;
  }> {
    if (contactIds.length === 0 && emails.length === 0) {
      return { byId: new Map(), byEmail: new Map() };
    }

    const conditions = ['c.account_id = $1'];
    const values: Array<string | string[]> = [organizationId];
    let parameter = 2;

    const identityConditions: string[] = [];
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
    appendContactScopeConditions(conditions, values, scope, parameter);

    const result = await this.pool.query<{ contact_id: string; email: string | null }>(
      `
        SELECT c.id AS contact_id, c.email
        FROM contacts c
        WHERE ${conditions.join(' AND ')}
      `,
      values
    );

    const byEmail = new Map<string, string[]>();
    result.rows.forEach((row) => {
      if (row.email) {
        const key = row.email.toLowerCase();
        const ids = byEmail.get(key) ?? [];
        ids.push(row.contact_id);
        byEmail.set(key, ids);
      }
    });

    return {
      byId: new Map(result.rows.map((row) => [row.contact_id, row.contact_id])),
      byEmail,
    };
  }

  private async lookupAccounts(
    accountIds: string[],
    accountNumbers: string[],
    _scope?: DataScopeFilter
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
      conditions.push(`a.id = ANY($${parameter}::uuid[])`);
      values.push(accountIds);
      parameter += 1;
    }

    if (accountNumbers.length) {
      conditions.push(`a.account_number = ANY($${parameter}::text[])`);
      values.push(accountNumbers);
      parameter += 1;
    }

    const result = await this.pool.query<{ account_id: string; account_number: string | null }>(
      `
        SELECT a.id AS account_id, a.account_number
        FROM accounts a
        WHERE (${conditions.join(' OR ')})
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
    payload: ParsedContactRow,
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
    payload: ParsedContactRow,
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
      values.push(payload.birth_date);
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

export default ContactImportExportUseCase;
