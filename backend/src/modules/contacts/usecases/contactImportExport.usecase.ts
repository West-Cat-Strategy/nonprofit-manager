import { Pool, type PoolClient } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import {
  buildTabularExport,
  type GeneratedTabularFile,
  type TabularExportColumn,
} from '@modules/shared/export/tabularExport';
import { parsePeopleImportFile } from '@modules/shared/import/peopleImportParser';
import { encrypt } from '@utils/encryption';

import {
  type ContactExportRequest,
  type ContactImportCommitResult,
  type ContactImportPreview,
  type ExportableContactQueryRow,
  type ExportableContactRow,
  type ParsedContactRow,
} from './contactImportExport.types';
import {
  CONTACT_DEFAULT_EXPORT_COLUMN_KEYS,
  CONTACT_EXPORT_COLUMNS,
  CONTACT_PHN_EXPORT_ROLES,
  CONTACT_SORT_COLUMNS,
  CONTACT_TEMPLATE_COLUMNS,
} from './contactImportExport.constants';
import { buildContactWhereClause } from './contactImportExport.utils';
import {
  analyzeContactImport,
  type ContactImportAnalysis,
  exportContactRow,
  resolveExportColumns,
} from './internal/contactImportExport.helpers';

export class ContactImportExportUseCase {
  constructor(private readonly pool: Pool) {}

  async exportContacts(
    request: ContactExportRequest,
    organizationId: string,
    scope?: DataScopeFilter,
    viewerRole?: string
  ): Promise<GeneratedTabularFile> {
    const columns = resolveExportColumns(
      request.columns,
      viewerRole,
      CONTACT_DEFAULT_EXPORT_COLUMN_KEYS,
      CONTACT_EXPORT_COLUMNS,
      CONTACT_PHN_EXPORT_ROLES
    ) as Array<TabularExportColumn<ExportableContactRow>>;
    const includePhn = columns.some((column) => column.key === 'phn');
    const { clause, values } = buildContactWhereClause(organizationId, request, scope, request.ids);
    const sortColumn = CONTACT_SORT_COLUMNS[request.sort_by || ''] ?? CONTACT_SORT_COLUMNS.last_name;
    const sortOrder = request.sort_order === 'desc' ? 'DESC' : 'ASC';

    const result = await this.pool.query<ExportableContactQueryRow>(
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
          ${includePhn ? 'c.phn_encrypted' : 'NULL::text'} AS phn_encrypted,
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

    const rows = result.rows.map((row) => exportContactRow(row, includePhn));

    return buildTabularExport({
      format: request.format,
      fallbackBaseName: `contacts-export-${new Date().toISOString().split('T')[0]}`,
      sheets: [
        {
          name: 'Contacts',
          columns,
          rows,
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

  private async analyzeImport(
    parsed: Awaited<ReturnType<typeof parsePeopleImportFile>>,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<ContactImportAnalysis> {
    return analyzeContactImport(parsed, organizationId, scope, this.pool);
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
