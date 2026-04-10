import pool from '@config/database';
import { logger } from '@config/logger';

export interface AuditLogRow {
  id: string;
  tableName: string;
  recordId: string;
  operation: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[] | null;
  changedBy: string | null;
  changedByEmail: string | null;
  changedAt: string;
  clientIpAddress: string | null;
  userAgent: string | null;
  isSensitive: boolean;
  summary: string;
  details: string;
}

export interface AuditLogPage {
  logs: AuditLogRow[];
  total: number;
  warning?: string;
}

export interface AuditLogQueryOptions {
  limit: number;
  offset: number;
  userId?: string;
}

const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${tableName}`]
  );
  return result.rows[0]?.exists === true;
};

const humanizeTableName = (value: string): string =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getValuesObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const getChangedFieldList = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    return value.filter((field): field is string => typeof field === 'string' && field.length > 0);
  }

  return null;
};

const formatSummary = (row: {
  table_name: string;
  operation: string;
  changed_fields: string[] | null;
}): string => {
  const tableLabel = humanizeTableName(row.table_name);
  const operation = row.operation.toUpperCase();

  if (row.table_name === 'users') {
    if (operation === 'INSERT') return 'Created user account';
    if (operation === 'DELETE') return 'Deleted user account';
    if (row.changed_fields?.includes('role')) return 'Updated user role';
    if (row.changed_fields?.includes('is_active')) return 'Updated account status';
    return 'Updated user account';
  }

  if (row.table_name === 'user_roles') {
    if (operation === 'INSERT') return 'Assigned role to user';
    if (operation === 'DELETE') return 'Removed role from user';
    return 'Updated user role assignment';
  }

  if (row.table_name === 'roles') {
    if (operation === 'INSERT') return 'Created role';
    if (operation === 'DELETE') return 'Deleted role';
    return 'Updated role';
  }

  return `${tableLabel} ${operation.toLowerCase()}`;
};

const formatDetails = (row: {
  changed_fields: string[] | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}) => {
  if (row.changed_fields && row.changed_fields.length > 0) {
    return `Changed: ${row.changed_fields.join(', ')}`;
  }

  if (row.new_values && Object.keys(row.new_values).length > 0) {
    return 'Captured new values';
  }

  if (row.old_values && Object.keys(row.old_values).length > 0) {
    return 'Captured previous values';
  }

  return 'No additional details';
};

const mapModernRow = (row: {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  old_values: unknown;
  new_values: unknown;
  changed_fields: unknown;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: Date;
  client_ip_address: unknown;
  user_agent: string | null;
  is_sensitive: boolean | null;
}): AuditLogRow => {
  const changedFields = getChangedFieldList(row.changed_fields);
  const oldValues = getValuesObject(row.old_values);
  const newValues = getValuesObject(row.new_values);

  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    operation: row.operation,
    oldValues,
    newValues,
    changedFields,
    changedBy: row.changed_by,
    changedByEmail: row.changed_by_email,
    changedAt: row.changed_at.toISOString(),
    clientIpAddress: row.client_ip_address ? String(row.client_ip_address) : null,
    userAgent: row.user_agent,
    isSensitive: Boolean(row.is_sensitive),
    summary: formatSummary({
      table_name: row.table_name,
      operation: row.operation,
      changed_fields: changedFields,
    }),
    details: formatDetails({
      changed_fields: changedFields,
      old_values: oldValues,
      new_values: newValues,
    }),
  };
};

const mapLegacyRow = (row: {
  id: string;
  table_name: string;
  operation: string;
  changed_at: Date;
  changed_by_email: string | null;
  changed_fields?: unknown;
  changes?: unknown;
  old_values?: unknown;
  new_values?: unknown;
  is_sensitive?: boolean | null;
  changed_by?: string | null;
  record_id?: string | null;
  client_ip_address?: unknown;
  user_agent?: string | null;
  details?: string | null;
}): AuditLogRow => {
  const changedFields = getChangedFieldList(row.changed_fields);
  const oldValues = getValuesObject(row.old_values);
  const newValues = getValuesObject(row.new_values);

  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id || row.id,
    operation: row.operation,
    oldValues,
    newValues,
    changedFields,
    changedBy: row.changed_by ?? null,
    changedByEmail: row.changed_by_email,
    changedAt: row.changed_at.toISOString(),
    clientIpAddress: row.client_ip_address ? String(row.client_ip_address) : null,
    userAgent: row.user_agent ?? null,
    isSensitive: Boolean(row.is_sensitive),
    summary: `${humanizeTableName(row.table_name)} ${row.operation.toLowerCase()}`,
    details:
      row.details ||
      (changedFields && changedFields.length > 0
        ? `Changed: ${changedFields.join(', ')}`
        : 'No additional details'),
  };
};

const buildWhereClause = (options: AuditLogQueryOptions): { clause: string; params: unknown[] } => {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (options.userId) {
    params.push(options.userId);
    const userParam = `$${params.length}`;
    clauses.push(`(al.changed_by = ${userParam}::uuid OR al.record_id = ${userParam}::uuid)`);
  }

  return {
    clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
};

const loadAuditLogPageModern = async (
  options: AuditLogQueryOptions
): Promise<AuditLogPage | null> => {
  if (!(await tableExists('audit_log'))) {
    return {
      logs: [],
      total: 0,
      warning: 'Audit logging not enabled',
    };
  }

  const { clause, params } = buildWhereClause(options);
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;

  const logsQuery = `
    SELECT
      al.id,
      al.table_name,
      al.record_id,
      al.operation,
      al.old_values,
      al.new_values,
      al.changed_fields,
      al.changed_by,
      u.email AS changed_by_email,
      al.changed_at,
      al.client_ip_address,
      al.user_agent,
      al.is_sensitive
    FROM audit_log al
    LEFT JOIN users u ON al.changed_by = u.id
    ${clause}
    ORDER BY al.changed_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}`;

  const countQuery = `
    SELECT COUNT(*)::text AS count
    FROM audit_log al
    ${clause}`;

  const logs = await pool.query(logsQuery, [...params, options.limit, options.offset]);
  const count = await pool.query(countQuery, params);

  return {
    logs: logs.rows.map(mapModernRow),
    total: Number.parseInt(count.rows[0]?.count ?? '0', 10) || 0,
  };
};

const loadAuditLogPageLegacy = async (
  options: AuditLogQueryOptions
): Promise<AuditLogPage | null> => {
  const { clause, params } = buildWhereClause(options);
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;

  try {
    const logsQuery = `
      SELECT
        al.id,
        al.table_name,
        al.operation,
        al.changed_at,
        u.email AS changed_by_email,
        al.changed_fields,
        al.old_values,
        al.new_values,
        al.is_sensitive,
        al.changed_by,
        al.record_id,
        al.client_ip_address,
        al.user_agent,
        al.changes AS details
      FROM audit_log al
      LEFT JOIN users u ON al.changed_by = u.id
      ${clause}
      ORDER BY al.changed_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`;

    const countQuery = `
      SELECT COUNT(*)::text AS count
      FROM audit_log al
      ${clause}`;

    const logs = await pool.query(logsQuery, [...params, options.limit, options.offset]);
    const count = await pool.query(countQuery, params);

    return {
      logs: logs.rows.map(mapLegacyRow),
      total: Number.parseInt(count.rows[0]?.count ?? '0', 10) || 0,
    };
  } catch (error) {
    logger.warn('Legacy audit log query failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const getAuditLogPage = async (
  options: AuditLogQueryOptions
): Promise<AuditLogPage> => {
  try {
    const modern = await loadAuditLogPageModern(options);
    if (modern) {
      return modern;
    }

    const legacy = await loadAuditLogPageLegacy(options);
    if (legacy) {
      return legacy;
    }
  } catch (error) {
    logger.warn('Modern audit log query failed; trying legacy fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const legacy = await loadAuditLogPageLegacy(options);
  if (legacy) {
    return legacy;
  }

  return {
    logs: [],
    total: 0,
    warning: 'Failed to fetch audit logs',
  };
};

