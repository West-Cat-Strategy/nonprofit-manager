import type { Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import { buildTabularExport, type GeneratedTabularFile } from '@modules/shared/export/tabularExport';
import {
  VOLUNTEER_SORT_COLUMNS,
  VOLUNTEER_TEMPLATE_COLUMNS,
} from '../volunteerImportExport.constants';
import type {
  ExportableVolunteerRow,
  VolunteerExportRequest,
} from '../volunteerImportExport.types';
import {
  buildVolunteerWhereClause,
  resolveVolunteerExportColumns,
} from '../volunteerImportExport.utils';

export const exportVolunteers = async (
  pool: Pick<Pool, 'query'>,
  request: VolunteerExportRequest,
  organizationId: string,
  scope?: DataScopeFilter
): Promise<GeneratedTabularFile> => {
  const columns = resolveVolunteerExportColumns(request.columns);
  const { clause, values } = buildVolunteerWhereClause(
    organizationId,
    request,
    scope,
    request.ids
  );
  const sortColumn =
    VOLUNTEER_SORT_COLUMNS[request.sort_by || ''] ?? VOLUNTEER_SORT_COLUMNS.last_name;
  const sortOrder = request.sort_order === 'desc' ? 'DESC' : 'ASC';

  const result = await pool.query<ExportableVolunteerRow>(
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
};

export const getVolunteerImportTemplate = async (
  format: 'csv' | 'xlsx'
): Promise<GeneratedTabularFile> =>
  buildTabularExport({
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
