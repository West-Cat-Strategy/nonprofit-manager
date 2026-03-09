import type { Pool, PoolClient, QueryResultRow } from 'pg';
import pool from '@config/database';
import type { AnalyticsEventType, WebsiteConversionFunnel } from '@app-types/publishing';

type ConversionStep = 'view' | 'submit' | 'confirm';
type ConversionType = 'pageview' | 'form_submit' | 'donation' | 'event_register';
type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

interface ConversionEventRow extends QueryResultRow {
  id: string;
  conversion_type: ConversionType;
  conversion_step: ConversionStep;
  page_path: string;
  visitor_id: string | null;
  session_id: string | null;
  referrer: string | null;
  user_agent: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  event_data: Record<string, unknown> | string | null;
  occurred_at: string | Date;
}

interface FunnelAggregateRow extends QueryResultRow {
  conversion_step: ConversionStep;
  total_count: string;
  unique_actors: string;
}

export interface RecordConversionEventInput {
  siteId: string;
  eventType: ConversionType;
  step: ConversionStep;
  pagePath: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
  eventData?: Record<string, unknown>;
  occurredAt?: string | Date;
}

const parseEventData = (
  value: ConversionEventRow['event_data']
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  return value;
};

const toIsoString = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export class ConversionEventService {
  constructor(private readonly db: Pool) {}

  async recordEvent(
    input: RecordConversionEventInput,
    queryable: Queryable = this.db
  ): Promise<void> {
    await queryable.query(
      `INSERT INTO conversion_events (
         organization_id,
         site_id,
         conversion_type,
         conversion_step,
         page_path,
         visitor_id,
         session_id,
         referrer,
         user_agent,
         source_entity_type,
         source_entity_id,
         source_table,
         source_record_id,
         event_data,
         occurred_at
       )
       VALUES (
         (SELECT organization_id FROM published_sites WHERE id = $1),
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9,
         $10::uuid,
         $11,
         $12::uuid,
         $13::jsonb,
         $14
       )
       ON CONFLICT DO NOTHING`,
      [
        input.siteId,
        input.eventType,
        input.step,
        input.pagePath,
        input.visitorId || null,
        input.sessionId || null,
        input.referrer || null,
        input.userAgent || null,
        input.sourceEntityType || null,
        input.sourceEntityId || null,
        input.sourceTable || null,
        input.sourceRecordId || null,
        JSON.stringify(input.eventData || {}),
        input.occurredAt ? new Date(input.occurredAt) : new Date(),
      ]
    );
  }

  async recordAnalyticsEvent(
    siteId: string,
    eventType: AnalyticsEventType,
    data: {
      pagePath: string;
      visitorId?: string;
      sessionId?: string;
      userAgent?: string;
      referrer?: string;
      eventData?: Record<string, unknown>;
    },
    sourceRecordId?: string
  ): Promise<void> {
    if (eventType === 'click') {
      return;
    }

    if (eventType === 'pageview') {
      await this.recordEvent({
        siteId,
        eventType: 'pageview',
        step: 'view',
        pagePath: data.pagePath,
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        userAgent: data.userAgent,
        referrer: data.referrer,
        sourceTable: sourceRecordId ? 'site_analytics' : null,
        sourceRecordId: sourceRecordId || null,
        eventData: data.eventData,
      });
      return;
    }

    const sourceEntityType =
      typeof data.eventData?.sourceEntityType === 'string'
        ? data.eventData.sourceEntityType
        : null;
    const sourceEntityId =
      typeof data.eventData?.sourceEntityId === 'string'
        ? data.eventData.sourceEntityId
        : null;

    await this.recordEvent({
      siteId,
      eventType,
      step: 'submit',
      pagePath: data.pagePath,
      visitorId: data.visitorId,
      sessionId: data.sessionId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      sourceEntityType,
      sourceEntityId,
      sourceTable: sourceRecordId ? 'site_analytics' : null,
      sourceRecordId: sourceRecordId || null,
      eventData: data.eventData,
    });

    await this.recordEvent({
      siteId,
      eventType,
      step: 'confirm',
      pagePath: data.pagePath,
      visitorId: data.visitorId,
      sessionId: data.sessionId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      sourceEntityType,
      sourceEntityId,
      sourceTable: sourceRecordId ? 'site_analytics' : null,
      sourceRecordId: sourceRecordId || null,
      eventData: data.eventData,
    });
  }

  async getFunnel(siteId: string, windowDays: number): Promise<WebsiteConversionFunnel> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - windowDays);

    const [aggregateResult, recentResult] = await Promise.all([
      this.db.query<FunnelAggregateRow>(
        `SELECT
           conversion_step,
           COUNT(*)::text AS total_count,
           COUNT(DISTINCT COALESCE(visitor_id, session_id, source_entity_id::text, id::text))::text AS unique_actors
         FROM conversion_events
         WHERE site_id = $1
           AND occurred_at >= $2
         GROUP BY conversion_step`,
        [siteId, periodStart]
      ),
      this.db.query<ConversionEventRow>(
        `SELECT *
         FROM conversion_events
         WHERE site_id = $1
           AND occurred_at >= $2
         ORDER BY occurred_at DESC
         LIMIT 20`,
        [siteId, periodStart]
      ),
    ]);

    const steps: ConversionStep[] = ['view', 'submit', 'confirm'];
    const aggregates = new Map(
      aggregateResult.rows.map((row) => [
        row.conversion_step,
        {
          count: Number.parseInt(row.total_count, 10),
          uniqueVisitors: Number.parseInt(row.unique_actors, 10),
        },
      ])
    );

    return {
      siteId,
      periodStart,
      periodEnd,
      steps: steps.map((step) => ({
        step,
        count: aggregates.get(step)?.count ?? 0,
        uniqueVisitors: aggregates.get(step)?.uniqueVisitors ?? 0,
      })),
      recentEvents: recentResult.rows.map((row) => ({
        id: row.id,
        conversionType: row.conversion_type,
        step: row.conversion_step,
        pagePath: row.page_path,
        visitorId: row.visitor_id,
        sessionId: row.session_id,
        referrer: row.referrer,
        userAgent: row.user_agent,
        sourceEntityType: row.source_entity_type,
        sourceEntityId: row.source_entity_id,
        eventData: parseEventData(row.event_data) || {},
        occurredAt: toIsoString(row.occurred_at),
      })),
    };
  }
}

export const conversionEventService = new ConversionEventService(pool);
export default conversionEventService;
