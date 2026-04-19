import type { Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { ParsedPeopleImportFile } from '@modules/shared/import/peopleImportParser';
import {
  findDuplicateMappedFields,
  getImportRowNumber,
  hasAnyMappedValue,
} from '@modules/shared/import/importUtils';
import { createContactSchema, updateContactSchema } from '@validations/contact';
import type {
  VolunteerImportAnalysisResult,
  ParsedVolunteerImportRow,
} from '../volunteerImportExport.types';
import { volunteerFieldSchema } from '../volunteerImportExport.types';
import {
  buildVolunteerContactValidationPayload,
  buildVolunteerFieldValidationPayload,
  mapVolunteerImportRow,
  resolveVolunteerAccountReference,
  resolveVolunteerIdentity,
} from './volunteerImportExport.mapping';
import {
  lookupVolunteerAccounts,
  lookupVolunteerIdentities,
  lookupVolunteerRoleNames,
} from './volunteerImportExport.lookups';

export const analyzeVolunteerImport = async (
  parsed: Pick<ParsedPeopleImportFile, 'dataset' | 'rows' | 'mapping' | 'warnings'>,
  organizationId: string,
  scope: DataScopeFilter | undefined,
  pool: Pick<Pool, 'query'>
): Promise<VolunteerImportAnalysisResult> => {
  const rowErrors: VolunteerImportAnalysisResult['rowErrors'] = [];
  const warnings = [...parsed.warnings];
  const actions: VolunteerImportAnalysisResult['actions'] = [];

  const duplicateMappings = findDuplicateMappedFields(parsed.mapping);
  if (duplicateMappings.length > 0) {
    rowErrors.push({
      row_number: 0,
      messages: duplicateMappings.map((field) => `Multiple columns map to "${field}"`),
    });
  }

  const rows = parsed.rows.filter((row) => hasAnyMappedValue(row, parsed.mapping));
  const mappedRows = rows.map((row) => mapVolunteerImportRow(row, parsed.mapping));
  const volunteerIds = mappedRows
    .map((row) => row.volunteer_id)
    .filter((value): value is string => Boolean(value));
  const contactIds = mappedRows
    .map((row) => row.contact_id)
    .filter((value): value is string => Boolean(value));
  const emails = mappedRows
    .map((row) => row.email?.toLowerCase())
    .filter((value): value is string => Boolean(value));
  const accountIds = mappedRows
    .map((row) => row.account_id)
    .filter((value): value is string => Boolean(value));
  const accountNumbers = mappedRows
    .map((row) => row.account_number)
    .filter((value): value is string => Boolean(value));

  const [identities, accountLookup, availableRoles] = await Promise.all([
    lookupVolunteerIdentities(pool, volunteerIds, contactIds, emails, organizationId, scope),
    lookupVolunteerAccounts(pool, accountIds, accountNumbers, organizationId, scope),
    lookupVolunteerRoleNames(pool),
  ]);

  mappedRows.forEach((payload, rowIndex) => {
    const rowNumber = getImportRowNumber(parsed.dataset, rowIndex);
    const messages: string[] = [];

    if (payload.roles) {
      const missingRoles = payload.roles.filter((role) => !availableRoles.has(role));
      if (missingRoles.length > 0) {
        messages.push(`Unknown contact role(s): ${missingRoles.join(', ')}`);
      }
    }

    const resolvedAccountId = resolveVolunteerAccountReference(
      payload,
      accountLookup,
      organizationId,
      parsed.mapping,
      messages
    );
    const { matchedVolunteerId, matchedContactId } = resolveVolunteerIdentity(
      payload,
      identities,
      messages
    );

    const contactSchema = matchedContactId ? updateContactSchema : createContactSchema;
    const contactValidation = contactSchema.safeParse(
      buildVolunteerContactValidationPayload(payload, resolvedAccountId, organizationId)
    );
    if (!contactValidation.success) {
      messages.push(...contactValidation.error.issues.map((issue) => issue.message));
    }

    const volunteerValidation = volunteerFieldSchema.safeParse(
      buildVolunteerFieldValidationPayload(payload)
    );
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
};
