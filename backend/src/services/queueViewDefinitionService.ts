import pool from '@config/database';

export type QueueViewSurface = 'cases' | 'portal_appointments' | 'portal_conversations' | 'workbench';
export type QueueViewRowActionStyle = 'primary' | 'secondary' | 'danger';

export interface QueueViewRowAction {
  id: string;
  label: string;
  style: QueueViewRowActionStyle;
  permissionScope?: string[];
  metadata?: Record<string, unknown>;
}

export interface QueueViewDefinition {
  id: string;
  ownerUserId: string | null;
  surface: QueueViewSurface;
  name: string;
  filters: Record<string, unknown>;
  columns: unknown[];
  sort: Record<string, unknown>;
  rowLimit: number;
  dashboardBehavior: Record<string, unknown>;
  rowActions: QueueViewRowAction[];
  emptyState: Record<string, unknown>;
  permissionScope: string[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertQueueViewDefinitionInput {
  id?: string;
  ownerUserId?: string | null;
  surface: QueueViewSurface;
  name: string;
  filters?: Record<string, unknown>;
  columns?: unknown[];
  sort?: Record<string, unknown>;
  rowLimit?: number;
  dashboardBehavior?: Record<string, unknown>;
  rowActions?: QueueViewRowAction[];
  emptyState?: Record<string, unknown>;
  permissionScope?: string[];
  userId?: string | null;
}

export interface QueueViewCountResponse {
  surface: QueueViewSurface;
  viewId: string | null;
  count: number;
  rowLimit: number | null;
}

export interface QueueViewPreviewResponse<T = unknown> extends QueueViewCountResponse {
  rows: T[];
  rowActions: QueueViewRowAction[];
  emptyState: Record<string, unknown>;
}

interface QueueViewDefinitionRow {
  id: string;
  owner_user_id: string | null;
  surface: QueueViewSurface;
  name: string;
  filters: Record<string, unknown>;
  columns: unknown[];
  sort: Record<string, unknown>;
  row_limit: number;
  dashboard_behavior: Record<string, unknown>;
  permission_scope: string[];
  status: QueueViewDefinition['status'];
  created_at: Date;
  updated_at: Date;
}

const supportedSurfaces: QueueViewSurface[] = [
  'cases',
  'portal_appointments',
  'portal_conversations',
  'workbench',
];

const assertSupportedSurface = (surface: QueueViewSurface): void => {
  if (!supportedSurfaces.includes(surface)) {
    const error = new Error('Unsupported queue view surface') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeRowActionStyle = (style: unknown): QueueViewRowActionStyle =>
  style === 'primary' || style === 'danger' ? style : 'secondary';

const normalizeRowActions = (actions?: unknown[]): QueueViewRowAction[] =>
  (actions ?? [])
    .filter(isRecord)
    .filter(
      (action) =>
        typeof action.id === 'string' &&
        action.id.trim().length > 0 &&
        typeof action.label === 'string' &&
        action.label.trim().length > 0
    )
    .map((action) => ({
      id: String(action.id).trim(),
      label: String(action.label).trim(),
      style: normalizeRowActionStyle(action.style),
      permissionScope: normalizePermissionScope(
        Array.isArray(action.permissionScope)
          ? action.permissionScope.filter(
              (entry): entry is string => typeof entry === 'string'
            )
          : []
      ),
      metadata: isRecord(action.metadata) ? action.metadata : {},
    }));

const buildDashboardBehavior = (
  dashboardBehavior: Record<string, unknown> | undefined,
  rowActions?: QueueViewRowAction[],
  emptyState?: Record<string, unknown>
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...(dashboardBehavior ?? {}) };

  if (rowActions) {
    next.row_actions = normalizeRowActions(rowActions);
  }

  if (emptyState) {
    next.empty_state = emptyState;
  }

  return next;
};

const mapRow = (row: QueueViewDefinitionRow): QueueViewDefinition => {
  const dashboardBehavior = row.dashboard_behavior ?? {};
  const rowActions = Array.isArray(dashboardBehavior.row_actions)
    ? normalizeRowActions(dashboardBehavior.row_actions)
    : [];
  const emptyState = isRecord(dashboardBehavior.empty_state)
    ? dashboardBehavior.empty_state
    : {};

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    surface: row.surface,
    name: row.name,
    filters: row.filters ?? {},
    columns: row.columns ?? [],
    sort: row.sort ?? {},
    rowLimit: Number(row.row_limit),
    dashboardBehavior,
    rowActions,
    emptyState,
    permissionScope: row.permission_scope ?? [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const throwQueueViewOwnershipError = (): never => {
  const error = new Error('Queue view definition not found for current owner') as Error & {
    statusCode?: number;
  };
  error.statusCode = 404;
  throw error;
};

export async function listQueueViewDefinitions(
  surface: QueueViewSurface,
  ownerUserId?: string | null,
  permissionScopes: string[] = []
): Promise<QueueViewDefinition[]> {
  assertSupportedSurface(surface);

  if (!ownerUserId) {
    return [];
  }

  const normalizedPermissionScopes = normalizePermissionScope(permissionScopes);

  const result = await pool.query<QueueViewDefinitionRow>(
    `SELECT id, owner_user_id, surface, name, filters, columns, sort, row_limit,
            dashboard_behavior, permission_scope, status, created_at, updated_at
     FROM queue_view_definitions
     WHERE surface = $1
       AND status = 'active'
       AND owner_user_id = $2
       AND (
         cardinality(permission_scope) = 0
         OR permission_scope && $3::text[]
       )
     ORDER BY updated_at DESC, name ASC`,
    [surface, ownerUserId, normalizedPermissionScopes]
  );

  return result.rows.map(mapRow);
}

export async function upsertQueueViewDefinition(
  input: UpsertQueueViewDefinitionInput
): Promise<QueueViewDefinition> {
  assertSupportedSurface(input.surface);

  const permissionScope = normalizePermissionScope(input.permissionScope ?? []);
  const dashboardBehavior = buildDashboardBehavior(
    input.dashboardBehavior,
    input.rowActions,
    input.emptyState
  );
  const values = [
    input.id ?? null,
    input.ownerUserId ?? null,
    input.surface,
    input.name.trim(),
    JSON.stringify(input.filters ?? {}),
    JSON.stringify(input.columns ?? []),
    JSON.stringify(input.sort ?? {}),
    input.rowLimit ?? 25,
    JSON.stringify(dashboardBehavior),
    permissionScope,
    input.userId ?? null,
  ];

  if (input.id) {
    const result = await pool.query<QueueViewDefinitionRow>(
      `UPDATE queue_view_definitions
       SET name = $4,
           filters = $5,
           columns = $6,
           sort = $7,
           row_limit = $8,
           dashboard_behavior = $9,
           permission_scope = $10,
           updated_by = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND owner_user_id IS NOT DISTINCT FROM $2::uuid
         AND surface = $3
       RETURNING id, owner_user_id, surface, name, filters, columns, sort, row_limit,
                 dashboard_behavior, permission_scope, status, created_at, updated_at`,
      values
    );

    if (!result.rows[0]) {
      return throwQueueViewOwnershipError();
    }

    return mapRow(result.rows[0]);
  }

  const result = await pool.query<QueueViewDefinitionRow>(
    `INSERT INTO queue_view_definitions (
       owner_user_id, surface, name, filters, columns, sort, row_limit,
       dashboard_behavior, permission_scope, created_by, updated_by
     )
     VALUES ($2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING id, owner_user_id, surface, name, filters, columns, sort, row_limit,
               dashboard_behavior, permission_scope, status, created_at, updated_at`,
    values
  );

  return mapRow(result.rows[0]);
}

export async function archiveQueueViewDefinition(args: {
  id: string;
  ownerUserId?: string | null;
  surface: QueueViewSurface;
  permissionScopes?: string[];
  userId?: string | null;
}): Promise<QueueViewDefinition> {
  assertSupportedSurface(args.surface);

  const result = await pool.query<QueueViewDefinitionRow>(
    `UPDATE queue_view_definitions
     SET status = 'archived',
         updated_by = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND owner_user_id IS NOT DISTINCT FROM $2::uuid
       AND surface = $3
       AND (
         cardinality(permission_scope) = 0
         OR permission_scope && $4::text[]
       )
     RETURNING id, owner_user_id, surface, name, filters, columns, sort, row_limit,
               dashboard_behavior, permission_scope, status, created_at, updated_at`,
    [
      args.id,
      args.ownerUserId ?? null,
      args.surface,
      normalizePermissionScope(args.permissionScopes ?? []),
      args.userId ?? null,
    ]
  );

  if (!result.rows[0]) {
    return throwQueueViewOwnershipError();
  }

  return mapRow(result.rows[0]);
}

export function buildQueueViewCountResponse(args: {
  surface: QueueViewSurface;
  view?: QueueViewDefinition | null;
  count: number;
}): QueueViewCountResponse {
  assertSupportedSurface(args.surface);

  return {
    surface: args.surface,
    viewId: args.view?.id ?? null,
    count: Math.max(0, Math.trunc(args.count)),
    rowLimit: args.view?.rowLimit ?? null,
  };
}

export function buildQueueViewPreviewResponse<T>(args: {
  surface: QueueViewSurface;
  view?: QueueViewDefinition | null;
  count: number;
  rows: T[];
}): QueueViewPreviewResponse<T> {
  const countResponse = buildQueueViewCountResponse({
    surface: args.surface,
    view: args.view,
    count: args.count,
  });

  return {
    ...countResponse,
    rows: args.rows.slice(0, args.view?.rowLimit ?? args.rows.length),
    rowActions: args.view?.rowActions ?? [],
    emptyState: args.view?.emptyState ?? {},
  };
}

export const queueViewDefinitionService = {
  archiveQueueViewDefinition,
  buildQueueViewCountResponse,
  buildQueueViewPreviewResponse,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
};

export default queueViewDefinitionService;

const normalizePermissionScope = (scope: string[]): string[] =>
  Array.from(
    new Set(
      scope
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  ).sort();
