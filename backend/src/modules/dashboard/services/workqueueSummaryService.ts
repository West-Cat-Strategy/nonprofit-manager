import pool from '@config/database';
import { hasStaticPermissionAccess } from '@services/authorization';
import { Permission } from '@utils/permissions';

export type DashboardWorkqueueSummaryId = 'intake_resolution' | 'portal_escalations';

export interface DashboardWorkqueueAction {
  label: string;
  href: string;
}

export interface DashboardWorkqueueRow {
  id: string;
  label: string;
  detail: string;
  href: string;
}

export interface DashboardWorkqueueSummaryCard {
  id: DashboardWorkqueueSummaryId;
  label: string;
  count: number;
  detail: string;
  permissionScope: string[];
  primaryAction: DashboardWorkqueueAction;
  rows?: DashboardWorkqueueRow[];
}

export interface DashboardWorkqueueSummaryContext {
  userId: string | null | undefined;
  role: string | null | undefined;
  roles?: string[];
  organizationId?: string | null;
}

interface CountRow {
  count: string | number;
}

interface PortalEscalationRow {
  id: string;
  case_id: string;
  case_number: string | null;
  case_title: string | null;
  severity: string;
  status: string;
  sla_due_at: Date | null;
}

const parseCount = (value: string | number | undefined): number => {
  const count = typeof value === 'number' ? value : Number.parseInt(value ?? '0', 10);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
};

const hasPermission = (
  context: DashboardWorkqueueSummaryContext,
  permission: Permission
): boolean => {
  if (!context.userId || !context.role) {
    return false;
  }

  return hasStaticPermissionAccess(context.role, permission, context.roles);
};

const getIntakeResolutionSummary = async (
  context: DashboardWorkqueueSummaryContext
): Promise<DashboardWorkqueueSummaryCard> => {
  const result = await pool.query<CountRow>(
    `SELECT COUNT(*)::int AS count
     FROM portal_signup_requests psr
     WHERE psr.status = 'pending'
	       AND psr.resolution_status = 'needs_contact_resolution'
	       AND $1::uuid IS NOT NULL
	       AND (
	         psr.account_id = $1
	         OR EXISTS (
	           SELECT 1
	           FROM contacts scope_contact
	           WHERE scope_contact.account_id = $1
	             AND lower(scope_contact.email) = lower(psr.email)
	         )
	       )`,
    [context.organizationId ?? null]
  );
  const count = parseCount(result.rows[0]?.count);

  return {
    id: 'intake_resolution',
    label: 'Intake resolution',
    count,
    detail:
      count === 0
        ? 'No portal signup requests need contact matching.'
        : `${count} portal signup ${count === 1 ? 'request needs' : 'requests need'} contact matching.`,
    permissionScope: [Permission.ADMIN_USERS],
    primaryAction: {
      label: count === 0 ? 'Open portal access' : 'Resolve portal signups',
      href: '/settings/admin/portal/access',
    },
  };
};

const getPortalEscalationSummary = async (
  context: DashboardWorkqueueSummaryContext
): Promise<DashboardWorkqueueSummaryCard> => {
  if (!context.organizationId) {
    return {
      id: 'portal_escalations',
      label: 'Portal escalations',
      count: 0,
      detail: 'No open portal review requests need staff triage.',
      permissionScope: [Permission.CASE_VIEW],
      primaryAction: {
        label: 'Open cases',
        href: '/cases',
      },
      rows: [],
    };
  }

  const params = [context.userId ?? null, context.organizationId ?? null];
  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::int AS count
     FROM portal_escalations pe
     JOIN cases c ON c.id = pe.case_id
     WHERE pe.status IN ('open', 'in_review')
       AND (pe.assignee_user_id IS NULL OR pe.assignee_user_id = $1)
       AND (c.account_id = $2 OR pe.account_id = $2)`,
    params
  );
  const count = parseCount(countResult.rows[0]?.count);

  const rowsResult = await pool.query<PortalEscalationRow>(
    `SELECT pe.id, pe.case_id, c.case_number, c.title AS case_title,
            pe.severity, pe.status, pe.sla_due_at
     FROM portal_escalations pe
     JOIN cases c ON c.id = pe.case_id
     WHERE pe.status IN ('open', 'in_review')
       AND (pe.assignee_user_id IS NULL OR pe.assignee_user_id = $1)
       AND (c.account_id = $2 OR pe.account_id = $2)
     ORDER BY
       CASE pe.severity
         WHEN 'urgent' THEN 0
         WHEN 'high' THEN 1
         WHEN 'normal' THEN 2
         ELSE 3
       END,
       pe.sla_due_at ASC NULLS LAST,
       pe.created_at DESC
     LIMIT 3`,
    params
  );

  return {
    id: 'portal_escalations',
    label: 'Portal escalations',
    count,
    detail:
      count === 0
        ? 'No open portal review requests need staff triage.'
        : `${count} portal review ${count === 1 ? 'request needs' : 'requests need'} staff triage.`,
    permissionScope: [Permission.CASE_VIEW],
    primaryAction: {
      label: count === 0 ? 'Open cases' : 'Review portal requests',
      href:
        count > 0 && rowsResult.rows[0]
          ? `/cases/${rowsResult.rows[0].case_id}?tab=portal`
          : '/cases',
    },
    rows: rowsResult.rows.map((row) => ({
      id: row.id,
      label: row.case_number ?? row.case_title ?? 'Portal review request',
      detail: `${row.severity} / ${row.status.replace('_', ' ')}`,
      href: `/cases/${row.case_id}?tab=portal`,
    })),
  };
};

export const getDashboardWorkqueueSummary = async (
  context: DashboardWorkqueueSummaryContext
): Promise<DashboardWorkqueueSummaryCard[]> => {
  const cards: DashboardWorkqueueSummaryCard[] = [];

  if (hasPermission(context, Permission.ADMIN_USERS)) {
    cards.push(await getIntakeResolutionSummary(context));
  }

  if (hasPermission(context, Permission.CASE_VIEW)) {
    cards.push(await getPortalEscalationSummary(context));
  }

  return cards;
};

export const dashboardWorkqueueSummaryService = {
  getDashboardWorkqueueSummary,
};

export default dashboardWorkqueueSummaryService;
