import { Pool } from 'pg';
import pool from '@config/database';
import type { OutcomeReportFilters, OutcomeReportResult } from '@app-types/outcomes';

const buildSharedWhereClause = (
  filters: OutcomeReportFilters,
  includeNonReportable: boolean
): { clause: string; values: unknown[] } => {
  const conditions: string[] = [
    `ioi.impact = true`,
    `cn.created_at >= $1::date`,
    `cn.created_at < ($2::date + INTERVAL '1 day')`,
  ];

  const values: unknown[] = [filters.from, filters.to];

  if (!includeNonReportable) {
    conditions.push(`od.is_reportable = true`);
  }

  if (filters.staffId) {
    values.push(filters.staffId);
    conditions.push(`cn.created_by = $${values.length}`);
  }

  if (filters.interactionType) {
    values.push(filters.interactionType);
    conditions.push(`cn.note_type = $${values.length}`);
  }

  return {
    clause: conditions.join(' AND '),
    values,
  };
};

export class OutcomeReportService {
  constructor(private readonly pool: Pool) {}

  async getOutcomesReport(filters: OutcomeReportFilters, isAdmin: boolean): Promise<OutcomeReportResult> {
    const bucket = filters.bucket === 'month' ? 'month' : 'week';
    const includeNonReportable = Boolean(filters.includeNonReportable && isAdmin);

    const sharedWhere = buildSharedWhereClause(filters, includeNonReportable);

    const totalsResult = await this.pool.query(
      `
      SELECT
        od.id AS outcome_definition_id,
        od.key,
        od.name,
        COUNT(*)::int AS count_impacts,
        COUNT(DISTINCT c.contact_id)::int AS unique_clients_impacted,
        od.sort_order
      FROM interaction_outcome_impacts ioi
      INNER JOIN outcome_definitions od
        ON od.id = ioi.outcome_definition_id
      INNER JOIN case_notes cn
        ON cn.id = ioi.interaction_id
      INNER JOIN cases c
        ON c.id = cn.case_id
      WHERE ${sharedWhere.clause}
      GROUP BY od.id, od.key, od.name, od.sort_order
      ORDER BY od.sort_order ASC, od.name ASC
    `,
      sharedWhere.values
    );

    const timeseriesResult = await this.pool.query(
      `
      SELECT
        date_trunc('${bucket}', cn.created_at)::date AS bucket_start,
        od.id AS outcome_definition_id,
        COUNT(*)::int AS count_impacts,
        od.sort_order
      FROM interaction_outcome_impacts ioi
      INNER JOIN outcome_definitions od
        ON od.id = ioi.outcome_definition_id
      INNER JOIN case_notes cn
        ON cn.id = ioi.interaction_id
      WHERE ${sharedWhere.clause}
      GROUP BY bucket_start, od.id, od.sort_order
      ORDER BY bucket_start ASC, od.sort_order ASC
    `,
      sharedWhere.values
    );

    return {
      totalsByOutcome: totalsResult.rows.map((row) => ({
        outcomeDefinitionId: row.outcome_definition_id,
        key: row.key,
        name: row.name,
        countImpacts: row.count_impacts,
        uniqueClientsImpacted: row.unique_clients_impacted,
      })),
      timeseries: timeseriesResult.rows.map((row) => ({
        bucketStart: row.bucket_start,
        outcomeDefinitionId: row.outcome_definition_id,
        countImpacts: row.count_impacts,
      })),
    };
  }
}

const outcomeReportServiceInstance = new OutcomeReportService(pool);

export const getOutcomesReport = outcomeReportServiceInstance.getOutcomesReport.bind(
  outcomeReportServiceInstance
);

export default outcomeReportServiceInstance;
