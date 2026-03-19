import type { Pool, PoolClient, QueryResultRow } from 'pg';
import pool from '@config/database';
import type { Activity } from '@app-types/activity';
import { logger } from '@config/logger';

type ActivityEntityType = Activity['entity_type'];
type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

const ACTIVITY_EVENT_COLUMNS = `
  id,
  organization_id,
  site_id,
  activity_type,
  title,
  description,
  actor_user_id,
  actor_name,
  entity_type,
  entity_id,
  related_entity_type,
  related_entity_id,
  metadata,
  occurred_at
`;

interface ActivityEventRow extends QueryResultRow {
  id: string;
  organization_id: string | null;
  site_id: string | null;
  activity_type: Activity['type'];
  title: string;
  description: string;
  actor_user_id: string | null;
  actor_name: string | null;
  entity_type: ActivityEntityType;
  entity_id: string;
  related_entity_type: ActivityEntityType | null;
  related_entity_id: string | null;
  metadata: Record<string, unknown> | string | null;
  occurred_at: string | Date;
}

export interface CreateActivityEventInput {
  organizationId?: string | null;
  siteId?: string | null;
  type: Activity['type'];
  title: string;
  description: string;
  timestamp?: string | Date;
  userId?: string | null;
  userName?: string | null;
  entityType: ActivityEntityType;
  entityId: string;
  relatedEntityType?: ActivityEntityType | null;
  relatedEntityId?: string | null;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const toIsoString = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const parseMetadata = (
  value: ActivityEventRow['metadata']
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

const mapRowToActivity = (row: ActivityEventRow): Activity => ({
  id: row.id,
  type: row.activity_type,
  title: row.title,
  description: row.description,
  timestamp: toIsoString(row.occurred_at),
  user_id: row.actor_user_id,
  user_name: row.actor_name,
  entity_type: row.entity_type,
  entity_id: row.entity_id,
  metadata: parseMetadata(row.metadata),
});

export class ActivityEventService {
  private supportsSourceColumnsCache: boolean | null = null;

  constructor(private readonly db: Pool) {}

  private async supportsSourceColumns(queryable: Queryable): Promise<boolean> {
    if (this.supportsSourceColumnsCache !== null) {
      return this.supportsSourceColumnsCache;
    }

    try {
      const result = await queryable.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'activity_events'
           AND column_name IN ('source_table', 'source_record_id')`
      );
      this.supportsSourceColumnsCache = Number.parseInt(result.rows[0]?.count ?? '0', 10) === 2;
    } catch (error) {
      logger.warn('Failed to inspect activity_events schema; falling back to legacy insert mode', {
        error,
      });
      this.supportsSourceColumnsCache = false;
    }

    return this.supportsSourceColumnsCache;
  }

  async recordEvent(
    input: CreateActivityEventInput,
    queryable: Queryable = this.db
  ): Promise<Activity> {
    const supportsSourceColumns = await this.supportsSourceColumns(queryable);
    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
    const metadataJson = JSON.stringify(input.metadata || {});
    const params = [
      input.organizationId || null,
      input.siteId || null,
      input.type,
      input.title,
      input.description,
      input.userId || null,
      input.userName || null,
      input.entityType,
      input.entityId,
      input.relatedEntityType || null,
      input.relatedEntityId || null,
      metadataJson,
      timestamp,
    ];

    const result = supportsSourceColumns
      ? await queryable.query<ActivityEventRow>(
          `INSERT INTO activity_events (
             organization_id,
             site_id,
             activity_type,
             title,
             description,
             actor_user_id,
             actor_name,
             entity_type,
             entity_id,
             related_entity_type,
             related_entity_id,
             source_table,
           source_record_id,
           metadata,
           occurred_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::uuid, $14::jsonb, $15)
           ON CONFLICT DO NOTHING
           RETURNING ${ACTIVITY_EVENT_COLUMNS}`,
          [
            ...params.slice(0, 11),
            input.sourceTable || null,
            input.sourceRecordId || null,
            metadataJson,
            timestamp,
          ]
        )
      : await queryable.query<ActivityEventRow>(
        `INSERT INTO activity_events (
             organization_id,
             site_id,
             activity_type,
             title,
             description,
             actor_user_id,
             actor_name,
             entity_type,
             entity_id,
             related_entity_type,
             related_entity_id,
             metadata,
             occurred_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
           RETURNING ${ACTIVITY_EVENT_COLUMNS}`,
          params
        );

    if (result.rows[0]) {
      return mapRowToActivity(result.rows[0]);
    }

    if (supportsSourceColumns && input.sourceTable && input.sourceRecordId) {
      const existing = await queryable.query<ActivityEventRow>(
        `SELECT ${ACTIVITY_EVENT_COLUMNS}
         FROM activity_events
         WHERE source_table = $1
           AND source_record_id = $2::uuid
           AND activity_type = $3
         LIMIT 1`,
        [input.sourceTable, input.sourceRecordId, input.type]
      );

      if (existing.rows[0]) {
        return mapRowToActivity(existing.rows[0]);
      }
    }

    throw new Error('Failed to record activity event');
  }

  async listRecentActivities(
    limit: number,
    organizationId?: string
  ): Promise<Activity[]> {
    const result = await this.db.query<ActivityEventRow>(
      `SELECT ${ACTIVITY_EVENT_COLUMNS}
       FROM activity_events
       WHERE ($1::uuid IS NULL OR organization_id = $1)
       ORDER BY occurred_at DESC
       LIMIT $2`,
      [organizationId || null, limit]
    );

    return result.rows.map(mapRowToActivity);
  }

  async listActivitiesForEntity(
    entityType: ActivityEntityType,
    entityId: string,
    organizationId?: string
  ): Promise<Activity[]> {
    const result = await this.db.query<ActivityEventRow>(
      `SELECT ${ACTIVITY_EVENT_COLUMNS}
       FROM activity_events
       WHERE (($1::uuid IS NULL OR organization_id = $1))
         AND (
           (entity_type = $2 AND entity_id = $3::uuid)
           OR (related_entity_type = $2 AND related_entity_id = $3::uuid)
         )
       ORDER BY occurred_at DESC
       LIMIT 100`,
      [organizationId || null, entityType, entityId]
    );

    return result.rows.map(mapRowToActivity);
  }
}

export const activityEventService = new ActivityEventService(pool);
export default activityEventService;
