import { Pool } from 'pg';
import pool from '@config/database';
import type {
  OutcomeReportFilters,
  OutcomeReportResult,
  OutcomeReportSourceFilter,
} from '@app-types/outcomes';

const normalizeSourceFilter = (source: OutcomeReportFilters['source']): OutcomeReportSourceFilter => {
  if (source === 'interaction' || source === 'event') {
    return source;
  }

  return 'all';
};

export class OutcomeReportService {
  constructor(private readonly pool: Pool) {}

  async getOutcomesReport(filters: OutcomeReportFilters, isAdmin: boolean): Promise<OutcomeReportResult> {
    const bucket = filters.bucket === 'month' ? 'month' : 'week';
    const includeNonReportable = Boolean(filters.includeNonReportable && isAdmin);
    const sourceFilter = normalizeSourceFilter(filters.source);

    const values: unknown[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    const sourceQueries: string[] = [];

    if (sourceFilter === 'all' || sourceFilter === 'interaction') {
      const interactionConditions: string[] = [`ioi.impact = true`];

      const interactionFromRef = addValue(filters.from);
      const interactionToRef = addValue(filters.to);
      interactionConditions.push(`cn.created_at >= ${interactionFromRef}::date`);
      interactionConditions.push(`cn.created_at < (${interactionToRef}::date + INTERVAL '1 day')`);

      if (!includeNonReportable) {
        interactionConditions.push(`od.is_reportable = true`);
      }

      if (filters.staffId) {
        const staffRef = addValue(filters.staffId);
        interactionConditions.push(`cn.created_by = ${staffRef}`);
      }

      if (filters.interactionType) {
        const interactionTypeRef = addValue(filters.interactionType);
        interactionConditions.push(`cn.note_type = ${interactionTypeRef}`);
      }

      sourceQueries.push(`
        SELECT
          od.id::text AS outcome_definition_id,
          od.key AS key,
          od.name AS name,
          c.contact_id,
          date_trunc('${bucket}', cn.created_at)::date AS bucket_start,
          'interaction'::text AS source,
          'interaction'::text AS workflow_stage,
          od.sort_order AS sort_order
        FROM interaction_outcome_impacts ioi
        INNER JOIN outcome_definitions od
          ON od.id = ioi.outcome_definition_id
        INNER JOIN case_notes cn
          ON cn.id = ioi.interaction_id
        INNER JOIN cases c
          ON c.id = cn.case_id
        WHERE ${interactionConditions.join(' AND ')}
      `);
    }

    if (sourceFilter === 'all' || sourceFilter === 'event') {
      const eventConditions: string[] = [];

      const eventFromRef = addValue(filters.from);
      const eventToRef = addValue(filters.to);
      eventConditions.push(`co.outcome_date >= ${eventFromRef}::date`);
      eventConditions.push(`co.outcome_date < (${eventToRef}::date + INTERVAL '1 day')`);

      if (!includeNonReportable) {
        eventConditions.push(`(od.id IS NULL OR od.is_reportable = true)`);
      }

      if (filters.staffId) {
        const staffRef = addValue(filters.staffId);
        eventConditions.push(`co.created_by = ${staffRef}`);
      }

      sourceQueries.push(`
        SELECT
          COALESCE(
            co.outcome_definition_id::text,
            'event:' || md5(lower(trim(COALESCE(co.outcome_type, 'unspecified'))))
          ) AS outcome_definition_id,
          COALESCE(
            od.key,
            'legacy_' || regexp_replace(lower(COALESCE(co.outcome_type, 'unspecified')), '[^a-z0-9]+', '_', 'g')
          ) AS key,
          COALESCE(
            od.name,
            NULLIF(BTRIM(co.outcome_type), ''),
            'Unspecified outcome'
          ) AS name,
          c.contact_id,
          date_trunc('${bucket}', co.outcome_date::timestamptz)::date AS bucket_start,
          'event'::text AS source,
          COALESCE(co.workflow_stage, 'legacy')::text AS workflow_stage,
          COALESCE(od.sort_order, 999999) AS sort_order
        FROM case_outcomes co
        INNER JOIN cases c
          ON c.id = co.case_id
        LEFT JOIN outcome_definitions od
          ON od.id = co.outcome_definition_id
        WHERE ${eventConditions.join(' AND ')}
      `);
    }

    if (sourceQueries.length === 0) {
      return {
        totalsByOutcome: [],
        timeseries: [],
      };
    }

    const sourceRowsCte = `WITH source_rows AS (\n${sourceQueries.join('\nUNION ALL\n')}\n)`;

    const totalsResult = await this.pool.query(
      `${sourceRowsCte}
      SELECT
        source_rows.outcome_definition_id,
        MIN(source_rows.key) AS key,
        MIN(source_rows.name) AS name,
        COUNT(*)::int AS count_impacts,
        COUNT(DISTINCT source_rows.contact_id)::int AS unique_clients_impacted,
        COUNT(*) FILTER (WHERE source_rows.source = 'interaction')::int AS interaction_count_impacts,
        COUNT(DISTINCT CASE WHEN source_rows.source = 'interaction' THEN source_rows.contact_id END)::int
          AS interaction_unique_clients_impacted,
        COUNT(*) FILTER (WHERE source_rows.source = 'event')::int AS event_count_impacts,
        COUNT(DISTINCT CASE WHEN source_rows.source = 'event' THEN source_rows.contact_id END)::int
          AS event_unique_clients_impacted,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'interaction')::int
          AS workflow_stage_interaction_count,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'conversation')::int
          AS workflow_stage_conversation_count,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'appointment')::int
          AS workflow_stage_appointment_count,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'follow_up')::int
          AS workflow_stage_follow_up_count,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'case_status')::int
          AS workflow_stage_case_status_count,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'manual')::int
          AS workflow_stage_manual_count,
        COUNT(*) FILTER (WHERE source_rows.workflow_stage = 'legacy')::int
          AS workflow_stage_legacy_count,
        MIN(source_rows.sort_order) AS sort_order
      FROM source_rows
      GROUP BY source_rows.outcome_definition_id
      ORDER BY sort_order ASC, MIN(source_rows.name) ASC
    `,
      values
    );

    const timeseriesResult = await this.pool.query(
      `${sourceRowsCte}
      SELECT
        source_rows.bucket_start,
        source_rows.outcome_definition_id,
        source_rows.source,
        source_rows.workflow_stage,
        COUNT(*)::int AS count_impacts,
        MIN(source_rows.sort_order) AS sort_order,
        MIN(source_rows.name) AS name
      FROM source_rows
      GROUP BY
        source_rows.bucket_start,
        source_rows.outcome_definition_id,
        source_rows.source,
        source_rows.workflow_stage
      ORDER BY
        source_rows.bucket_start ASC,
        sort_order ASC,
        name ASC,
        source_rows.source ASC,
        source_rows.workflow_stage ASC
    `,
      values
    );

    return {
      totalsByOutcome: totalsResult.rows.map((row) => ({
        outcomeDefinitionId: row.outcome_definition_id,
        key: row.key,
        name: row.name,
        countImpacts: row.count_impacts,
        uniqueClientsImpacted: row.unique_clients_impacted,
        sourceBreakdown: {
          interaction: {
            countImpacts: row.interaction_count_impacts,
            uniqueClientsImpacted: row.interaction_unique_clients_impacted,
          },
          event: {
            countImpacts: row.event_count_impacts,
            uniqueClientsImpacted: row.event_unique_clients_impacted,
          },
        },
        workflowStageBreakdown: {
          interaction: row.workflow_stage_interaction_count,
          conversation: row.workflow_stage_conversation_count,
          appointment: row.workflow_stage_appointment_count,
          follow_up: row.workflow_stage_follow_up_count,
          case_status: row.workflow_stage_case_status_count,
          manual: row.workflow_stage_manual_count,
          legacy: row.workflow_stage_legacy_count,
        },
      })),
      timeseries: timeseriesResult.rows.map((row) => ({
        bucketStart: row.bucket_start,
        outcomeDefinitionId: row.outcome_definition_id,
        source: row.source,
        workflowStage: row.workflow_stage,
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
