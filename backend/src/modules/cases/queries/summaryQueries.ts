import { Pool } from 'pg';
import type { CaseSummary } from '@app-types/case';
import { getRequestContext } from '@config/requestContext';

export const getCaseSummaryQuery = async (db: Pool, organizationId?: string): Promise<CaseSummary> => {
  const resolvedOrganizationId =
    organizationId || getRequestContext()?.organizationId || getRequestContext()?.accountId || getRequestContext()?.tenantId;
  const scopeParams: string[] = [];
  const scopeValues: unknown[] = [];
  if (resolvedOrganizationId) {
    scopeValues.push(resolvedOrganizationId);
    scopeParams.push(`COALESCE(c.account_id, con.account_id) = $${scopeValues.length}`);
  }
  const scopeClause = scopeParams.length > 0 ? `WHERE ${scopeParams.join(' AND ')}` : '';

  const result = await db.query(
    `
    WITH scoped_cases AS (
      SELECT
        c.id,
        c.case_type_id,
        c.outcome,
        c.priority,
        c.is_urgent,
        c.due_date,
        c.opened_date,
        c.closed_date,
        c.intake_date,
        c.status_id,
        c.assigned_to,
        cs.status_type
      FROM cases c
      LEFT JOIN contacts con ON con.id = c.contact_id
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
      ${scopeClause}
    ),
    summary_stats AS (
      SELECT
        COUNT(*) AS total_cases,
        COUNT(*) FILTER (WHERE status_type IN ('intake', 'active', 'review')) AS open_cases,
        COUNT(*) FILTER (WHERE status_type IN ('closed', 'cancelled')) AS closed_cases,
        COUNT(*) FILTER (WHERE priority = 'low') AS priority_low,
        COUNT(*) FILTER (WHERE priority = 'medium') AS priority_medium,
        COUNT(*) FILTER (WHERE priority = 'high') AS priority_high,
        COUNT(*) FILTER (WHERE is_urgent = true OR priority IN ('urgent', 'critical')) AS priority_urgent,
        COUNT(*) FILTER (WHERE status_type = 'intake') AS status_intake,
        COUNT(*) FILTER (WHERE status_type = 'active') AS status_active,
        COUNT(*) FILTER (WHERE status_type = 'review') AS status_review,
        COUNT(*) FILTER (WHERE status_type = 'closed') AS status_closed,
        COUNT(*) FILTER (WHERE status_type = 'cancelled') AS status_cancelled,
        COUNT(*) FILTER (WHERE due_date <= CURRENT_DATE + INTERVAL '7 days' AND due_date >= CURRENT_DATE) AS due_this_week,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status_type NOT IN ('closed', 'cancelled')) AS overdue,
        COUNT(*) FILTER (WHERE assigned_to IS NULL AND status_type NOT IN ('closed', 'cancelled')) AS unassigned,
        AVG(EXTRACT(EPOCH FROM (COALESCE(closed_date, NOW()) - intake_date)) / 86400)
          FILTER (WHERE status_type IN ('closed', 'cancelled')) AS avg_duration
      FROM scoped_cases
    ),
    assigned_case_types AS (
      SELECT ct.name AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_type_assignments cta ON cta.case_id = sc.id
      JOIN case_types ct ON ct.id = cta.case_type_id
      GROUP BY ct.name
    ),
    legacy_case_types AS (
      SELECT COALESCE(ct.name, sc.case_type_id::text) AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      LEFT JOIN case_types ct ON ct.id = sc.case_type_id
      WHERE sc.case_type_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM case_type_assignments cta
          WHERE cta.case_id = sc.id
        )
      GROUP BY COALESCE(ct.name, sc.case_type_id::text)
    ),
    assigned_case_outcomes AS (
      SELECT coa.outcome_value AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_outcome_assignments coa ON coa.case_id = sc.id
      GROUP BY coa.outcome_value
    ),
    legacy_case_outcomes AS (
      SELECT sc.outcome AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      WHERE sc.outcome IS NOT NULL
        AND btrim(sc.outcome) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM case_outcome_assignments coa
          WHERE coa.case_id = sc.id
        )
      GROUP BY sc.outcome
    )
    SELECT
      total_cases,
      open_cases,
      closed_cases,
      priority_low,
      priority_medium,
      priority_high,
      priority_urgent,
      status_intake,
      status_active,
      status_review,
      status_closed,
      status_cancelled,
      due_this_week,
      overdue,
      unassigned,
      avg_duration
    FROM summary_stats
  `,
    scopeValues
  );

  const typeResult = await db.query(
    `
    WITH scoped_cases AS (
      SELECT
        c.id,
        c.case_type_id,
        c.outcome,
        c.priority,
        c.is_urgent,
        c.due_date,
        c.opened_date,
        c.closed_date,
        c.intake_date,
        c.status_id,
        c.assigned_to,
        cs.status_type
      FROM cases c
      LEFT JOIN contacts con ON con.id = c.contact_id
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
      ${scopeClause}
    ),
    assigned_case_types AS (
      SELECT ct.name AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_type_assignments cta ON cta.case_id = sc.id
      JOIN case_types ct ON ct.id = cta.case_type_id
      GROUP BY ct.name
    ),
    legacy_case_types AS (
      SELECT COALESCE(ct.name, sc.case_type_id::text) AS case_type_name, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      LEFT JOIN case_types ct ON ct.id = sc.case_type_id
      WHERE sc.case_type_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM case_type_assignments cta
          WHERE cta.case_id = sc.id
        )
      GROUP BY COALESCE(ct.name, sc.case_type_id::text)
    )
    SELECT case_type_name, SUM(count)::int AS count
    FROM (
      SELECT * FROM assigned_case_types
      UNION ALL
      SELECT * FROM legacy_case_types
    ) type_counts
    GROUP BY case_type_name
    ORDER BY count DESC, case_type_name ASC
  `,
    scopeValues
  );

  const outcomeResult = await db.query(
    `
    WITH scoped_cases AS (
      SELECT
        c.id,
        c.case_type_id,
        c.outcome,
        c.priority,
        c.is_urgent,
        c.due_date,
        c.opened_date,
        c.closed_date,
        c.intake_date,
        c.status_id,
        c.assigned_to,
        cs.status_type
      FROM cases c
      LEFT JOIN contacts con ON con.id = c.contact_id
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
      ${scopeClause}
    ),
    assigned_case_outcomes AS (
      SELECT coa.outcome_value AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      JOIN case_outcome_assignments coa ON coa.case_id = sc.id
      GROUP BY coa.outcome_value
    ),
    legacy_case_outcomes AS (
      SELECT sc.outcome AS case_outcome_value, COUNT(DISTINCT sc.id)::int AS count
      FROM scoped_cases sc
      WHERE sc.outcome IS NOT NULL
        AND btrim(sc.outcome) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM case_outcome_assignments coa
          WHERE coa.case_id = sc.id
        )
      GROUP BY sc.outcome
    )
    SELECT case_outcome_value, SUM(count)::int AS count
    FROM (
      SELECT * FROM assigned_case_outcomes
      UNION ALL
      SELECT * FROM legacy_case_outcomes
    ) outcome_counts
    GROUP BY case_outcome_value
    ORDER BY count DESC, case_outcome_value ASC
  `,
    scopeValues
  );

  const byCaseType: Record<string, number> = {};
  for (const row of typeResult.rows) {
    const caseTypeName = row.case_type_name ?? row.name;
    if (!caseTypeName) {
      continue;
    }
    byCaseType[caseTypeName] = parseInt(row.count, 10);
  }

  const byCaseOutcome: Record<string, number> = {};
  for (const row of outcomeResult.rows) {
    byCaseOutcome[row.case_outcome_value] = parseInt(row.count, 10);
  }

  const row = result.rows[0];
  return {
    total_cases: parseInt(row.total_cases, 10),
    open_cases: parseInt(row.open_cases, 10),
    closed_cases: parseInt(row.closed_cases, 10),
    by_priority: {
      low: parseInt(row.priority_low, 10),
      medium: parseInt(row.priority_medium, 10),
      high: parseInt(row.priority_high, 10),
      urgent: parseInt(row.priority_urgent, 10),
    },
    by_status_type: {
      intake: parseInt(row.status_intake, 10),
      active: parseInt(row.status_active, 10),
      review: parseInt(row.status_review, 10),
      closed: parseInt(row.status_closed, 10),
      cancelled: parseInt(row.status_cancelled, 10),
    },
    by_case_type: byCaseType,
    by_case_outcome: byCaseOutcome,
    average_case_duration_days: row.avg_duration ? Math.round(parseFloat(row.avg_duration)) : undefined,
    cases_due_this_week: parseInt(row.due_this_week, 10),
    overdue_cases: parseInt(row.overdue, 10),
    unassigned_cases: parseInt(row.unassigned, 10),
  };
};
