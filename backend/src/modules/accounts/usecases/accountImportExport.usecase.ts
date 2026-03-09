import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import type { AccountFilters } from '@app-types/account';
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
  parseBooleanLike,
  toNullableString,
  toTrimmedString,
  type ImportRowError,
} from '@modules/shared/import/importUtils';

type ExportableAccountRow = {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: string | null;
  category: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  is_active: boolean;
  created_at: Date | null;
  updated_at: Date | null;
};

type AccountExportRequest = AccountFilters & {
  format: 'csv' | 'xlsx';
  ids?: string[];
  columns?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

type ParsedAccountRow = {
  account_id?: string;
  account_number?: string | null;
  account_name?: string | null;
  account_type?: 'organization' | 'individual';
  category?:
    | 'donor'
    | 'volunteer'
    | 'partner'
    | 'vendor'
    | 'beneficiary'
    | 'other'
    | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tax_id?: string | null;
  is_active?: boolean;
};

type AccountImportAction =
  | {
      action: 'create';
      rowNumber: number;
      payload: ParsedAccountRow;
    }
  | {
      action: 'update';
      rowNumber: number;
      accountId: string;
      payload: ParsedAccountRow;
    };

export interface AccountImportPreview {
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

export interface AccountImportCommitResult {
  created: number;
  updated: number;
  total_processed: number;
  affected_ids: string[];
}

const accountTypeSchema = z.enum(['organization', 'individual']);
const accountCategorySchema = z.enum([
  'donor',
  'volunteer',
  'partner',
  'vendor',
  'beneficiary',
  'other',
]);

const createAccountImportSchema = z.object({
  account_number: z.string().trim().min(1).max(50).optional().nullable(),
  account_name: z.string().trim().min(1).max(255),
  account_type: accountTypeSchema,
  category: accountCategorySchema.optional().nullable(),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  address_line1: z.string().trim().optional().nullable(),
  address_line2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state_province: z.string().trim().optional().nullable(),
  postal_code: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  tax_id: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

const updateAccountImportSchema = createAccountImportSchema.partial().extend({
  account_name: z.string().trim().min(1).max(255).optional().nullable(),
});

const ACCOUNT_EXPORT_COLUMNS: Array<TabularExportColumn<ExportableAccountRow>> = [
  { key: 'account_id', header: 'account_id', width: 38 },
  { key: 'account_number', header: 'account_number', width: 18 },
  { key: 'account_name', header: 'account_name', width: 28 },
  { key: 'account_type', header: 'account_type', width: 18 },
  { key: 'category', header: 'category', width: 18 },
  { key: 'email', header: 'email', width: 24 },
  { key: 'phone', header: 'phone', width: 18 },
  { key: 'website', header: 'website', width: 28 },
  { key: 'description', header: 'description', width: 36 },
  { key: 'address_line1', header: 'address_line1', width: 24 },
  { key: 'address_line2', header: 'address_line2', width: 24 },
  { key: 'city', header: 'city', width: 18 },
  { key: 'state_province', header: 'state_province', width: 18 },
  { key: 'postal_code', header: 'postal_code', width: 16 },
  { key: 'country', header: 'country', width: 18 },
  { key: 'tax_id', header: 'tax_id', width: 18 },
  { key: 'is_active', header: 'is_active', width: 12 },
  { key: 'created_at', header: 'created_at', width: 22 },
  { key: 'updated_at', header: 'updated_at', width: 22 },
];

const ACCOUNT_TEMPLATE_COLUMNS = ACCOUNT_EXPORT_COLUMNS.filter(
  (column) => !['created_at', 'updated_at'].includes(column.key)
);

const ACCOUNT_SORT_COLUMNS: Record<string, string> = {
  created_at: 'a.created_at',
  updated_at: 'a.updated_at',
  account_name: 'a.account_name',
  account_number: 'a.account_number',
  account_type: 'a.account_type',
  category: 'a.category',
  email: 'a.email',
};

const appendAccountScopeConditions = (
  conditions: string[],
  values: Array<string | boolean | string[]>,
  scope: DataScopeFilter | undefined,
  startingParameter: number
): number => {
  let parameter = startingParameter;

  if (scope?.accountIds?.length) {
    conditions.push(`a.id = ANY($${parameter}::uuid[])`);
    values.push(scope.accountIds);
    parameter += 1;
  }

  if (scope?.createdByUserIds?.length) {
    conditions.push(`a.created_by = ANY($${parameter}::uuid[])`);
    values.push(scope.createdByUserIds);
    parameter += 1;
  }

  if (scope?.accountTypes?.length) {
    conditions.push(`a.account_type = ANY($${parameter}::text[])`);
    values.push(scope.accountTypes);
    parameter += 1;
  }

  return parameter;
};

const buildWhereClause = (
  filters: Omit<AccountExportRequest, 'format' | 'columns' | 'sort_by' | 'sort_order'>,
  scope?: DataScopeFilter,
  ids?: string[]
): { clause: string; values: Array<string | boolean | string[]> } => {
  const conditions: string[] = [];
  const values: Array<string | boolean | string[]> = [];
  let parameter = 1;

  if (ids && ids.length > 0) {
    conditions.push(`a.id = ANY($${parameter}::uuid[])`);
    values.push(ids);
    parameter += 1;
  } else {
    if (filters.search) {
      conditions.push(`(
        a.account_name ILIKE $${parameter}
        OR a.email ILIKE $${parameter}
        OR a.account_number ILIKE $${parameter}
      )`);
      values.push(`%${filters.search}%`);
      parameter += 1;
    }

    if (filters.account_type) {
      conditions.push(`a.account_type = $${parameter}`);
      values.push(filters.account_type);
      parameter += 1;
    }

    if (filters.category) {
      conditions.push(`a.category = $${parameter}`);
      values.push(filters.category);
      parameter += 1;
    }

    if (typeof filters.is_active === 'boolean') {
      conditions.push(`a.is_active = $${parameter}`);
      values.push(filters.is_active);
      parameter += 1;
    }
  }

  appendAccountScopeConditions(conditions, values, scope, parameter);

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
};

export class AccountImportExportUseCase {
  constructor(private readonly pool: Pool) {}

  async exportAccounts(
    request: AccountExportRequest,
    scope?: DataScopeFilter
  ): Promise<GeneratedTabularFile> {
    const requestedColumns = this.resolveColumns(request.columns);
    const { clause, values } = buildWhereClause(request, scope, request.ids);
    const sortColumn =
      ACCOUNT_SORT_COLUMNS[request.sort_by || ''] ?? ACCOUNT_SORT_COLUMNS.account_name;
    const sortOrder = request.sort_order === 'desc' ? 'DESC' : 'ASC';

    const result = await this.pool.query<ExportableAccountRow>(
      `
        SELECT
          a.id AS account_id,
          a.account_number,
          a.account_name,
          a.account_type,
          a.category,
          a.email,
          a.phone,
          a.website,
          a.description,
          a.address_line1,
          a.address_line2,
          a.city,
          a.state_province,
          a.postal_code,
          a.country,
          a.tax_id,
          a.is_active,
          a.created_at,
          a.updated_at
        FROM accounts a
        ${clause}
        ORDER BY ${sortColumn} ${sortOrder}, a.id ASC
      `,
      values
    );

    return buildTabularExport({
      format: request.format,
      fallbackBaseName: `accounts-export-${new Date().toISOString().split('T')[0]}`,
      sheets: [
        {
          name: 'Accounts',
          columns: requestedColumns,
          rows: result.rows,
        },
      ],
    });
  }

  async getImportTemplate(format: 'csv' | 'xlsx'): Promise<GeneratedTabularFile> {
    return buildTabularExport({
      format,
      fallbackBaseName: 'accounts-import-template',
      sheets: [
        {
          name: 'Accounts',
          columns: ACCOUNT_TEMPLATE_COLUMNS,
          rows: [],
        },
      ],
    });
  }

  async previewImport(
    file: Express.Multer.File,
    mapping?: Record<string, unknown>,
    scope?: DataScopeFilter
  ): Promise<AccountImportPreview> {
    const parsedFile = await parsePeopleImportFile(file, 'accounts', mapping);
    const analysis = await this.analyzeImport(parsedFile, scope);

    return {
      detected_columns: parsedFile.detectedColumns,
      mapping: parsedFile.mapping,
      mapping_candidates: parsedFile.mappingCandidates,
      field_options: parsedFile.fieldOptions,
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
    scope?: DataScopeFilter
  ): Promise<AccountImportCommitResult> {
    const parsedFile = await parsePeopleImportFile(file, 'accounts', mapping);
    const analysis = await this.analyzeImport(parsedFile, scope);

    if (analysis.rowErrors.length > 0) {
      throw Object.assign(new Error('Import preview contains validation errors'), {
        statusCode: 400,
        details: {
          row_errors: analysis.rowErrors,
        },
      });
    }

    const client = await this.pool.connect();
    const affectedIds: string[] = [];
    let created = 0;
    let updated = 0;

    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [911_000_001]);

      for (const action of analysis.actions) {
        if (action.action === 'create') {
          const accountId = await this.insertAccount(client, action.payload, userId);
          affectedIds.push(accountId);
          created += 1;
          continue;
        }

        await this.updateAccount(client, action.accountId, action.payload, userId);
        affectedIds.push(action.accountId);
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

  private resolveColumns(requested?: string[]): Array<TabularExportColumn<ExportableAccountRow>> {
    const defaults = ['account_id', 'account_number'];
    const selected =
      requested && requested.length > 0
        ? Array.from(new Set([...defaults, ...requested]))
        : ACCOUNT_EXPORT_COLUMNS.map((column) => column.key);

    return selected
      .map((key) => ACCOUNT_EXPORT_COLUMNS.find((column) => column.key === key))
      .filter((column): column is TabularExportColumn<ExportableAccountRow> => Boolean(column));
  }

  private async analyzeImport(
    parsedFile: Awaited<ReturnType<typeof parsePeopleImportFile>>,
    scope?: DataScopeFilter
  ): Promise<{
    actions: AccountImportAction[];
    toCreate: number;
    toUpdate: number;
    totalRows: number;
    rowErrors: ImportRowError[];
    warnings: string[];
  }> {
    const rowErrors: ImportRowError[] = [];
    const warnings = [...parsedFile.warnings];
    const actions: AccountImportAction[] = [];

    const duplicateMappings = findDuplicateMappedFields(parsedFile.mapping);
    if (duplicateMappings.length > 0) {
      rowErrors.push({
        row_number: 0,
        messages: duplicateMappings.map((field) => `Multiple columns map to "${field}"`),
      });
    }

    const rows = parsedFile.rows.filter((row) => hasAnyMappedValue(row, parsedFile.mapping));
    const accountIds = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsedFile.mapping, 'account_id')))
      .filter((value): value is string => Boolean(value));
    const accountNumbers = rows
      .map((row) => toTrimmedString(getMappedValue(row, parsedFile.mapping, 'account_number')))
      .filter((value): value is string => Boolean(value));

    const existingAccounts = await this.lookupExistingAccounts(accountIds, accountNumbers, scope);
    const seenNewAccountNumbers = new Set<string>();

    rows.forEach((row, rowIndex) => {
      const rowNumber = getImportRowNumber(parsedFile.dataset, rowIndex);
      const payload = this.mapRow(row, parsedFile.mapping);
      const messages: string[] = [];

      if (payload.account_id) {
        const existing = existingAccounts.byId.get(payload.account_id);
        if (!existing) {
          messages.push(`Account ID ${payload.account_id} was not found in the current scope.`);
        } else {
          const validation = updateAccountImportSchema.safeParse(payload);
          if (!validation.success) {
            messages.push(...validation.error.issues.map((issue) => issue.message));
          } else {
            actions.push({
              action: 'update',
              rowNumber,
              accountId: existing.account_id,
              payload: validation.data,
            });
          }
        }
      } else {
        const matchedByNumber =
          payload.account_number ? existingAccounts.byNumber.get(payload.account_number) : undefined;

        if (matchedByNumber) {
          const validation = updateAccountImportSchema.safeParse(payload);
          if (!validation.success) {
            messages.push(...validation.error.issues.map((issue) => issue.message));
          } else {
            actions.push({
              action: 'update',
              rowNumber,
              accountId: matchedByNumber.account_id,
              payload: validation.data,
            });
          }
        } else {
          const validation = createAccountImportSchema.safeParse(payload);
          if (!validation.success) {
            messages.push(...validation.error.issues.map((issue) => issue.message));
          } else {
            if (validation.data.account_number) {
              if (seenNewAccountNumbers.has(validation.data.account_number)) {
                messages.push(
                  `Account number ${validation.data.account_number} appears more than once in this import.`
                );
              }
              seenNewAccountNumbers.add(validation.data.account_number);
            }

            actions.push({
              action: 'create',
              rowNumber,
              payload: validation.data,
            });
          }
        }
      }

      if (messages.length > 0) {
        rowErrors.push({ row_number: rowNumber, messages });
      }
    });

    if (rows.length === 0) {
      warnings.push('No mapped data rows were found in the uploaded file.');
    }

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
  ): ParsedAccountRow {
    const normalizeAccountType = (
      value: string | null | undefined
    ): ParsedAccountRow['account_type'] => {
      const normalized = toTrimmedString(value)?.toLowerCase();
      return normalized === 'organization' || normalized === 'individual'
        ? normalized
        : undefined;
    };

    const normalizeCategory = (
      value: string | null | undefined
    ): ParsedAccountRow['category'] => {
      const normalized = toTrimmedString(value)?.toLowerCase();
      return accountCategorySchema.safeParse(normalized).success
        ? (normalized as ParsedAccountRow['category'])
        : undefined;
    };

    return {
      account_id: toTrimmedString(getMappedValue(row, mapping, 'account_id')),
      account_number: toNullableString(getMappedValue(row, mapping, 'account_number')),
      account_name: toNullableString(getMappedValue(row, mapping, 'account_name')),
      account_type: normalizeAccountType(getMappedValue(row, mapping, 'account_type')),
      category: normalizeCategory(getMappedValue(row, mapping, 'category')),
      email: toNullableString(getMappedValue(row, mapping, 'email')),
      phone: toNullableString(getMappedValue(row, mapping, 'phone')),
      website: toNullableString(getMappedValue(row, mapping, 'website')),
      description: toNullableString(getMappedValue(row, mapping, 'description')),
      address_line1: toNullableString(getMappedValue(row, mapping, 'address_line1')),
      address_line2: toNullableString(getMappedValue(row, mapping, 'address_line2')),
      city: toNullableString(getMappedValue(row, mapping, 'city')),
      state_province: toNullableString(getMappedValue(row, mapping, 'state_province')),
      postal_code: toNullableString(getMappedValue(row, mapping, 'postal_code')),
      country: toNullableString(getMappedValue(row, mapping, 'country')),
      tax_id: toNullableString(getMappedValue(row, mapping, 'tax_id')),
      is_active: parseBooleanLike(getMappedValue(row, mapping, 'is_active')),
    };
  }

  private async lookupExistingAccounts(
    accountIds: string[],
    accountNumbers: string[],
    scope?: DataScopeFilter
  ): Promise<{
    byId: Map<string, ExportableAccountRow>;
    byNumber: Map<string, ExportableAccountRow>;
  }> {
    const conditions: string[] = [];
    const values: Array<string[] | string> = [];
    let parameter = 1;

    if (accountIds.length > 0) {
      conditions.push(`a.id = ANY($${parameter}::uuid[])`);
      values.push(accountIds);
      parameter += 1;
    }

    if (accountNumbers.length > 0) {
      conditions.push(`a.account_number = ANY($${parameter}::text[])`);
      values.push(accountNumbers);
      parameter += 1;
    }

    if (conditions.length === 0) {
      return {
        byId: new Map(),
        byNumber: new Map(),
      };
    }

    const queryConditions = [`(${conditions.join(' OR ')})`];
    appendAccountScopeConditions(queryConditions, values, scope, parameter);

    const result = await this.pool.query<ExportableAccountRow>(
      `
        SELECT
          a.id AS account_id,
          a.account_number,
          a.account_name,
          a.account_type,
          a.category,
          a.email,
          a.phone,
          a.website,
          a.description,
          a.address_line1,
          a.address_line2,
          a.city,
          a.state_province,
          a.postal_code,
          a.country,
          a.tax_id,
          a.is_active,
          a.created_at,
          a.updated_at
        FROM accounts a
        WHERE ${queryConditions.join(' AND ')}
      `,
      values
    );

    return {
      byId: new Map(result.rows.map((row) => [row.account_id, row])),
      byNumber: new Map(
        result.rows
          .filter((row) => Boolean(row.account_number))
          .map((row) => [row.account_number, row] as const)
      ),
    };
  }

  private async generateAccountNumber(client: PoolClient): Promise<string> {
    const result = await client.query<{ max_number: string | null }>(
      `SELECT MAX(CAST(SPLIT_PART(account_number, '-', 2) AS INTEGER)) AS max_number
       FROM accounts
       WHERE account_number ~ '^ACC-[0-9]+$'`
    );

    const maxNumber = result.rows[0]?.max_number;
    if (!maxNumber || Number.isNaN(Number(maxNumber))) {
      return 'ACC-10001';
    }

    return `ACC-${Number(maxNumber) + 1}`;
  }

  private async insertAccount(
    client: PoolClient,
    payload: ParsedAccountRow,
    userId: string
  ): Promise<string> {
    const accountNumber = payload.account_number || (await this.generateAccountNumber(client));
    const result = await client.query<{ account_id: string }>(
      `
        INSERT INTO accounts (
          account_number,
          account_name,
          account_type,
          category,
          email,
          phone,
          website,
          description,
          address_line1,
          address_line2,
          city,
          state_province,
          postal_code,
          country,
          tax_id,
          is_active,
          created_by,
          modified_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, COALESCE($16, true), $17, $17
        )
        RETURNING id AS account_id
      `,
      [
        accountNumber,
        payload.account_name,
        payload.account_type,
        payload.category ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.website ?? null,
        payload.description ?? null,
        payload.address_line1 ?? null,
        payload.address_line2 ?? null,
        payload.city ?? null,
        payload.state_province ?? null,
        payload.postal_code ?? null,
        payload.country ?? null,
        payload.tax_id ?? null,
        payload.is_active,
        userId,
      ]
    );

    return result.rows[0].account_id;
  }

  private async updateAccount(
    client: PoolClient,
    accountId: string,
    payload: ParsedAccountRow,
    userId: string
  ): Promise<void> {
    const updates: string[] = [];
    const values: Array<string | boolean | null> = [];
    let parameter = 1;

    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'account_id' || value === undefined) {
        return;
      }
      updates.push(`${key} = $${parameter}`);
      values.push(value as string | boolean | null);
      parameter += 1;
    });

    updates.push(`modified_by = $${parameter}`);
    values.push(userId);
    parameter += 1;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(accountId);

    if (updates.length === 2) {
      return;
    }

    await client.query(
      `
        UPDATE accounts
        SET ${updates.join(', ')}
        WHERE id = $${parameter}
      `,
      values
    );
  }
}

export default AccountImportExportUseCase;
