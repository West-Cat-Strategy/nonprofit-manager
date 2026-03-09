import { Pool, PoolClient } from 'pg';
import type {
  CaseOutcomeEvent,
  CaseTopicDefinition,
  CaseTopicEvent,
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import {
  requireCaseIdForOutcome,
  requireCaseIdForTopicEvent,
  requireCaseOwnership,
  resolveVisibleToClient,
} from './shared';

type PgExecutor = Pool | PoolClient;

interface OutcomeDefinitionRow {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
}

const resolveOutcomeDefinition = async (
  db: PgExecutor,
  outcomeDefinitionId: string
): Promise<OutcomeDefinitionRow> => {
  const definitionResult = await db.query<OutcomeDefinitionRow>(
    `
    SELECT id, key, name, is_active
    FROM outcome_definitions
    WHERE id = $1
    LIMIT 1
  `,
    [outcomeDefinitionId]
  );

  const definition = definitionResult.rows[0];
  if (!definition) {
    throw new Error('Outcome definition not found');
  }

  if (!definition.is_active) {
    throw new Error('Outcome definition is inactive');
  }

  return definition;
};

const ensureTopicDefinitionInCaseScope = async (
  db: PgExecutor,
  topicDefinitionId: string,
  accountId: string | null
): Promise<void> => {
  const result = await db.query(
    `
    SELECT id
    FROM case_topic_definitions
    WHERE id = $1
      AND is_active = true
      AND (
        ($2::uuid IS NULL AND account_id IS NULL)
        OR account_id = $2
      )
    LIMIT 1
  `,
    [topicDefinitionId, accountId]
  );

  if (!result.rows[0]) {
    throw new Error('Topic definition not found for case scope');
  }
};

export const getCaseOutcomesQuery = async (
  db: PgExecutor,
  caseId: string
): Promise<CaseOutcomeEvent[]> => {
  await requireCaseOwnership(db, caseId);
  const result = await db.query(
    `
    SELECT
      co.*,
      od.key AS outcome_definition_key,
      od.name AS outcome_definition_name,
      u.first_name,
      u.last_name
    FROM case_outcomes co
    LEFT JOIN outcome_definitions od
      ON od.id = co.outcome_definition_id
    LEFT JOIN users u
      ON u.id = co.created_by
    WHERE co.case_id = $1
    ORDER BY co.outcome_date DESC, co.created_at DESC
  `,
    [caseId]
  );
  return result.rows;
};

export const createCaseOutcomeQuery = async (
  db: PgExecutor,
  caseId: string,
  data: CreateCaseOutcomeDTO,
  userId?: string
): Promise<CaseOutcomeEvent> => {
  const ownership = await requireCaseOwnership(db, caseId);
  const visibleToClient = resolveVisibleToClient({
    visible_to_client: data.visible_to_client,
    is_portal_visible: data.is_portal_visible,
  });

  const definition = data.outcome_definition_id
    ? await resolveOutcomeDefinition(db, data.outcome_definition_id)
    : null;

  const outcomeType = data.outcome_type?.trim() || definition?.name || null;

  const result = await db.query(
    `
    INSERT INTO case_outcomes (
      case_id,
      account_id,
      outcome_type,
      outcome_definition_id,
      outcome_date,
      notes,
      visible_to_client,
      entry_source,
      workflow_stage,
      source_entity_type,
      source_entity_id,
      created_by,
      updated_by
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      COALESCE($5::date, CURRENT_DATE),
      $6,
      $7,
      'manual',
      $8,
      $9,
      $10::uuid,
      $11,
      $11
    )
    RETURNING *
  `,
    [
      caseId,
      ownership.account_id,
      outcomeType,
      definition?.id || null,
      data.outcome_date || null,
      data.notes || null,
      visibleToClient,
      data.workflow_stage || 'manual',
      data.source_entity_type || null,
      data.source_entity_id || null,
      userId || null,
    ]
  );

  return result.rows[0];
};

export const updateCaseOutcomeQuery = async (
  db: PgExecutor,
  outcomeId: string,
  data: UpdateCaseOutcomeDTO,
  userId?: string
): Promise<CaseOutcomeEvent> => {
  const caseId = await requireCaseIdForOutcome(db, outcomeId);
  await requireCaseOwnership(db, caseId);

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const definition = data.outcome_definition_id
    ? await resolveOutcomeDefinition(db, data.outcome_definition_id)
    : null;

  if (data.outcome_definition_id !== undefined) {
    fields.push(`outcome_definition_id = $${idx++}`);
    values.push(definition?.id || null);

    if (data.outcome_type === undefined && definition) {
      fields.push(`outcome_type = $${idx++}`);
      values.push(definition.name);
    }
  }

  if (data.outcome_type !== undefined) {
    fields.push(`outcome_type = $${idx++}`);
    values.push(data.outcome_type || null);
  }
  if (data.outcome_date !== undefined) {
    fields.push(`outcome_date = $${idx++}`);
    values.push(data.outcome_date);
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(data.notes || null);
  }
  if (data.visible_to_client !== undefined || data.is_portal_visible !== undefined) {
    fields.push(`visible_to_client = $${idx++}`);
    values.push(
      resolveVisibleToClient({
        visible_to_client: data.visible_to_client,
        is_portal_visible: data.is_portal_visible,
      })
    );
  }

  if (data.source_entity_type !== undefined) {
    fields.push(`source_entity_type = $${idx++}`);
    values.push(data.source_entity_type || null);
  }

  if (data.source_entity_id !== undefined) {
    fields.push(`source_entity_id = $${idx++}`);
    values.push(data.source_entity_id || null);
  }

  if (data.workflow_stage !== undefined) {
    fields.push(`workflow_stage = $${idx++}`);
    values.push(data.workflow_stage || null);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  fields.push(`updated_by = $${idx++}`);
  values.push(userId || null);
  values.push(outcomeId, caseId);

  const result = await db.query(
    `
    UPDATE case_outcomes
    SET ${fields.join(', ')}
    WHERE id = $${idx}
      AND case_id = $${idx + 1}
    RETURNING *
  `,
    values
  );

  if (!result.rows[0]) {
    throw new Error('Case outcome not found');
  }
  return result.rows[0];
};

export const deleteCaseOutcomeQuery = async (db: PgExecutor, outcomeId: string): Promise<boolean> => {
  const caseId = await requireCaseIdForOutcome(db, outcomeId);
  await requireCaseOwnership(db, caseId);

  const result = await db.query(
    `
    DELETE FROM case_outcomes
    WHERE id = $1
      AND case_id = $2
    RETURNING id
  `,
    [outcomeId, caseId]
  );
  return Boolean(result.rows[0]);
};

export const getCaseTopicDefinitionsQuery = async (
  db: PgExecutor,
  caseId: string
): Promise<CaseTopicDefinition[]> => {
  const ownership = await requireCaseOwnership(db, caseId);
  const result = await db.query(
    `
    SELECT *
    FROM case_topic_definitions
    WHERE is_active = true
      AND (
        ($1::uuid IS NULL AND account_id IS NULL)
        OR account_id = $1
      )
    ORDER BY name ASC
  `,
    [ownership.account_id]
  );

  return result.rows;
};

export const createCaseTopicDefinitionQuery = async (
  db: PgExecutor,
  caseId: string,
  data: CreateCaseTopicDefinitionDTO,
  userId?: string
): Promise<CaseTopicDefinition> => {
  const ownership = await requireCaseOwnership(db, caseId);
  const normalized = data.name.trim().toLowerCase().replace(/\s+/g, ' ');

  const result = await db.query(
    `
    INSERT INTO case_topic_definitions (
      account_id, name, normalized_name, created_by, updated_by
    )
    VALUES ($1, $2, $3, $4, $4)
    ON CONFLICT (account_id, normalized_name)
    DO UPDATE SET
      name = EXCLUDED.name,
      is_active = true,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by
    RETURNING *
  `,
    [ownership.account_id, data.name.trim(), normalized, userId || null]
  );

  return result.rows[0];
};

export const getCaseTopicEventsQuery = async (
  db: PgExecutor,
  caseId: string
): Promise<CaseTopicEvent[]> => {
  await requireCaseOwnership(db, caseId);

  const result = await db.query(
    `
    SELECT
      cte.*,
      ctd.name AS topic_name,
      u.first_name,
      u.last_name
    FROM case_topic_events cte
    JOIN case_topic_definitions ctd ON ctd.id = cte.topic_definition_id
    LEFT JOIN users u ON u.id = cte.created_by
    WHERE cte.case_id = $1
    ORDER BY cte.discussed_at DESC, cte.created_at DESC
  `,
    [caseId]
  );

  return result.rows;
};

export const addCaseTopicEventQuery = async (
  db: PgExecutor,
  caseId: string,
  data: CreateCaseTopicEventDTO,
  userId?: string
): Promise<CaseTopicEvent> => {
  const ownership = await requireCaseOwnership(db, caseId);

  let topicDefinitionId = data.topic_definition_id;
  if (!topicDefinitionId && data.topic_name) {
    const definition = await createCaseTopicDefinitionQuery(db, caseId, { name: data.topic_name }, userId);
    topicDefinitionId = definition.id;
  }

  if (!topicDefinitionId) {
    throw new Error('topic_definition_id or topic_name is required');
  }

  await ensureTopicDefinitionInCaseScope(db, topicDefinitionId, ownership.account_id);

  const result = await db.query(
    `
    INSERT INTO case_topic_events (
      case_id,
      account_id,
      topic_definition_id,
      discussed_at,
      notes,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6, $6)
    RETURNING *
  `,
    [
      caseId,
      ownership.account_id,
      topicDefinitionId,
      data.discussed_at || null,
      data.notes || null,
      userId || null,
    ]
  );

  return result.rows[0];
};

export const deleteCaseTopicEventQuery = async (db: PgExecutor, topicEventId: string): Promise<boolean> => {
  const caseId = await requireCaseIdForTopicEvent(db, topicEventId);
  await requireCaseOwnership(db, caseId);

  const result = await db.query(
    `
    DELETE FROM case_topic_events
    WHERE id = $1
      AND case_id = $2
    RETURNING id
  `,
    [topicEventId, caseId]
  );
  return Boolean(result.rows[0]);
};
