import type { DataScopeFilter } from '@app-types/dataScope';
import type { TabularExportColumn } from '@modules/shared/export/tabularExport';
import type { ParsedPeopleImportFile } from '@modules/shared/import/peopleImportParser';
import {
  VOLUNTEER_DEFAULT_INCLUDED_EXPORT_COLUMN_KEYS,
  VOLUNTEER_EXPORT_COLUMNS,
} from './volunteerImportExport.constants';
import type {
  ExportableVolunteerRow,
  VolunteerExportRequest,
  VolunteerImportAnalysisResult,
  VolunteerImportPreview,
} from './volunteerImportExport.types';

export const appendVolunteerScopeConditions = (
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

export const buildVolunteerWhereClause = (
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

export const resolveVolunteerExportColumns = (
  requested?: string[]
): Array<TabularExportColumn<ExportableVolunteerRow>> => {
  const selected =
    requested && requested.length > 0
      ? Array.from(new Set([...VOLUNTEER_DEFAULT_INCLUDED_EXPORT_COLUMN_KEYS, ...requested]))
      : VOLUNTEER_EXPORT_COLUMNS.map((column) => column.key);

  return selected
    .map((key) => VOLUNTEER_EXPORT_COLUMNS.find((column) => column.key === key))
    .filter((column): column is TabularExportColumn<ExportableVolunteerRow> => Boolean(column));
};

export const buildVolunteerImportPreview = (
  parsed: ParsedPeopleImportFile,
  analysis: VolunteerImportAnalysisResult
): VolunteerImportPreview => ({
  detected_columns: parsed.detectedColumns,
  mapping: parsed.mapping,
  mapping_candidates: parsed.mappingCandidates,
  field_options: parsed.fieldOptions,
  to_create: analysis.toCreate,
  to_update: analysis.toUpdate,
  total_rows: analysis.totalRows,
  row_errors: analysis.rowErrors,
  warnings: analysis.warnings,
});
