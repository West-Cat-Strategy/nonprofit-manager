import type { Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import { decrypt } from '@utils/encryption';
import { createContactSchema, updateContactSchema } from '@validations/contact';
import { parsePeopleImportFile } from '@modules/shared/import/peopleImportParser';
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
import { logger } from '@config/logger';
import { appendContactScopeConditions } from '@modules/contacts/usecases/contactImportExport.utils';
import { lookupScopedAccounts } from '@modules/shared/import/scopedAccountLookup';
import {
  type ContactImportAction,
  type ExportableContactQueryRow,
  type ParsedContactRow,
  type ExportableContactRow,
} from '../contactImportExport.types';

export type ContactImportAnalysis = {
  actions: ContactImportAction[];
  toCreate: number;
  toUpdate: number;
  totalRows: number;
  rowErrors: ImportRowError[];
  warnings: string[];
};

type ParsedContactImportPayload = Awaited<ReturnType<typeof parsePeopleImportFile>>;

export const resolveExportColumns = (
  requested: string[] | undefined,
  viewerRole: string | undefined,
  defaultColumns: string[],
  exportColumnsMap: Array<{ key: string }>,
  viewerRoleSet: Set<string>
): Array<{ key: string; header: string; width?: number }> => {
  const defaults = ['contact_id', 'email'];
  const selected =
    requested && requested.length > 0
      ? Array.from(
          new Set([
            ...defaults,
            ...requested.filter((key) => key !== 'phn' || canExportPhn(viewerRole, viewerRoleSet)),
          ])
        )
      : defaultColumns;

  return selected
    .map((key) => exportColumnsMap.find((column) => column.key === key))
    .filter((column): column is { key: string; header: string; width?: number } => Boolean(column));
};

const canExportPhn = (viewerRole: string | undefined, viewerRoleSet: Set<string>): boolean => {
  if (typeof viewerRole !== 'string') return false;
  return viewerRoleSet.has(viewerRole.trim().toLowerCase());
};

export const decryptExportPhn = (phnEncrypted: string | null, contactId: string): string | null => {
  if (!phnEncrypted) return null;

  try {
    return decrypt(phnEncrypted);
  } catch (error) {
    logger.warn('Failed to decrypt contact PHN during export; returning null', {
      contactId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const analyzeContactImport = async (
  parsed: ParsedContactImportPayload,
  organizationId: string,
  scope: DataScopeFilter | undefined,
  pool: Pool
): Promise<ContactImportAnalysis> => {
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

  const existingContacts = await lookupExistingContacts(pool, contactIds, emails, organizationId, scope);
  const accountLookup = await lookupAccounts(pool, accountIds, accountNumbers, organizationId, scope);
  const availableRoles = await lookupRoleNames(pool);

  rows.forEach((row, rowIndex) => {
    const rowNumber = getImportRowNumber(parsed.dataset, rowIndex);
    const payload = mapContactRow(row, parsed.mapping);
    const messages: string[] = [];

    if (payload.roles) {
      const missingRoles = payload.roles.filter((role) => !availableRoles.has(role));
      if (missingRoles.length > 0) {
        messages.push(`Unknown contact role(s): ${missingRoles.join(', ')}`);
      }
    }

    const resolvedAccount = resolveAccountReference(payload, accountLookup, organizationId, parsed.mapping, messages);

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

    if (!validation.success) return;

    const validatedPayload = validation.data as ParsedContactRow;
    if (matchedContactId) {
      actions.push({
        action: 'update',
        rowNumber,
        contactId: matchedContactId,
        payload: validatedPayload,
        ...(resolvedAccount !== undefined ? { resolvedAccountId: resolvedAccount } : {}),
      });
      return;
    }

    actions.push({
      action: 'create',
      rowNumber,
      payload: validatedPayload,
      resolvedAccountId: resolvedAccount ?? organizationId,
    });
  });

  return {
    actions,
    toCreate: actions.filter((action) => action.action === 'create').length,
    toUpdate: actions.filter((action) => action.action === 'update').length,
    totalRows: rows.length,
    rowErrors,
    warnings,
  };
};

const mapContactRow = (
  row: Record<string, string | null>,
  mapping: Record<string, string>
): ParsedContactRow => {
  const parseArrayField = (field: 'tags' | 'roles'): string[] | undefined => {
    if (!hasMappedField(mapping, field)) return undefined;
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
    preferred_contact_method: toNullableString(
      getMappedValue(row, mapping, 'preferred_contact_method')
    ),
    do_not_email: parseBooleanLike(getMappedValue(row, mapping, 'do_not_email')),
    do_not_phone: parseBooleanLike(getMappedValue(row, mapping, 'do_not_phone')),
    do_not_text: parseBooleanLike(getMappedValue(row, mapping, 'do_not_text')),
    do_not_voicemail: parseBooleanLike(getMappedValue(row, mapping, 'do_not_voicemail')),
    notes: toNullableString(getMappedValue(row, mapping, 'notes')),
    tags: parseArrayField('tags'),
    roles: parseArrayField('roles'),
    is_active: parseBooleanLike(getMappedValue(row, mapping, 'is_active')),
  };
};

const resolveAccountReference = (
  payload: ParsedContactRow,
  accountLookup: { byId: Map<string, string>; byNumber: Map<string, string> },
  organizationId: string,
  mapping: Record<string, string>,
  messages: string[]
): string | null | undefined => {
  const accountIdWasMapped = hasMappedField(mapping, 'account_id');
  const accountNumberWasMapped = hasMappedField(mapping, 'account_number');

  if (!accountIdWasMapped && !accountNumberWasMapped) return undefined;

  let resolvedFromId: string | undefined;
  let resolvedFromNumber: string | undefined;

  if (payload.account_id) {
    resolvedFromId = accountLookup.byId.get(payload.account_id);
    if (!resolvedFromId) {
      messages.push(`Account ID ${payload.account_id} was not found.`);
    }
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
};

const lookupExistingContacts = async (
  pool: Pool,
  contactIds: string[],
  emails: string[],
  organizationId: string,
  scope?: DataScopeFilter
): Promise<{ byId: Map<string, string>; byEmail: Map<string, string[]> }> => {
  if (contactIds.length === 0 && emails.length === 0) {
    return { byId: new Map(), byEmail: new Map() };
  }

  const conditions = ['c.account_id = $1'];
  const values: Array<string | string[] | boolean> = [organizationId];
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

  const result = await pool.query<{ contact_id: string; email: string | null }>(
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
};

const lookupAccounts = async (
  pool: Pool,
  accountIds: string[],
  accountNumbers: string[],
  organizationId: string,
  scope?: DataScopeFilter
): Promise<{ byId: Map<string, string>; byNumber: Map<string, string> }> => {
  const rows = await lookupScopedAccounts(pool, accountIds, accountNumbers, organizationId, scope);

  return {
    byId: new Map(rows.map((row) => [row.account_id, row.account_id])),
    byNumber: new Map(rows.filter((row) => Boolean(row.account_number)).map((row) => [row.account_number as string, row.account_id])),
  };
};

const lookupRoleNames = async (pool: Pool): Promise<Set<string>> => {
  const result = await pool.query<{ name: string }>('SELECT name FROM contact_roles');
  return new Set(result.rows.map((row) => row.name));
};

export const exportContactRow = (
  row: ExportableContactQueryRow,
  includePhn: boolean
): ExportableContactRow & { phn: string | null } => ({
  ...row,
  phn: includePhn ? decryptExportPhn(row.phn_encrypted, row.contact_id) : null,
});
