import type { Pool } from 'pg';
import type { ReportDefinition } from '@app-types/report';

export type ReportQueryPlan = {
  tableName: string;
  selectFields: string;
  whereClause: string;
  values: unknown[];
  groupByClause: string;
  orderByClause: string;
  limitClause: string;
  isGrouped: boolean;
};

export const MAX_DIRECT_EXPORT_ROWS = 2000;

export class DirectReportExportTooLargeError extends Error {
  constructor() {
    super('Report is too large for direct export');
    this.name = 'DirectReportExportTooLargeError';
  }
}

const normalizeQuery = (sql: string): string => sql.trim().replace(/\s+/g, ' ');

export const buildReportDataQuery = (
  plan: ReportQueryPlan,
  options?: { limitOverride?: number }
): string => {
  const limitClause =
    typeof options?.limitOverride === 'number' ? `LIMIT ${options.limitOverride}` : plan.limitClause;

  return normalizeQuery(`
    SELECT ${plan.selectFields}
    FROM ${plan.tableName}
    ${plan.whereClause}
    ${plan.groupByClause}
    ${plan.orderByClause}
    ${limitClause}
  `);
};

export const buildReportCountQuery = (plan: ReportQueryPlan): string =>
  normalizeQuery(`
    SELECT COUNT(*) as count
    FROM ${plan.tableName}
    ${plan.whereClause}
  `);

export const getUngroupedTotalCount = async (
  pool: Pick<Pool, 'query'>,
  plan: ReportQueryPlan
): Promise<number> => {
  const countResult = await pool.query(buildReportCountQuery(plan), plan.values);
  return parseInt(countResult.rows[0]?.count ?? '0', 10);
};

export const assertDirectReportExportSupported = async (
  pool: Pick<Pool, 'query'>,
  definition: ReportDefinition,
  plan: ReportQueryPlan
): Promise<void> => {
  if (!plan.isGrouped) {
    const totalCount = await getUngroupedTotalCount(pool, plan);
    const effectiveRowCount = Math.min(totalCount, definition.limit ?? Number.POSITIVE_INFINITY);
    if (effectiveRowCount > MAX_DIRECT_EXPORT_ROWS) {
      throw new DirectReportExportTooLargeError();
    }
    return;
  }

  if (typeof definition.limit === 'number') {
    if (definition.limit > MAX_DIRECT_EXPORT_ROWS) {
      throw new DirectReportExportTooLargeError();
    }
    return;
  }

  const probeResult = await pool.query(
    buildReportDataQuery(plan, { limitOverride: MAX_DIRECT_EXPORT_ROWS + 1 }),
    plan.values
  );

  if (probeResult.rows.length > MAX_DIRECT_EXPORT_ROWS) {
    throw new DirectReportExportTooLargeError();
  }
};
