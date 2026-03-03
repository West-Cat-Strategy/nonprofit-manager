import { Pool } from 'pg';
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

export const getCaseOutcomesQuery = async (db: Pool, caseId: string): Promise<CaseOutcomeEvent[]> => {
  await requireCaseOwnership(db, caseId);
  const result = await db.query(
    `
    SELECT
      co.*,
      u.first_name,
      u.last_name
    FROM case_outcomes co
    LEFT JOIN users u ON u.id = co.created_by
    WHERE co.case_id = $1
    ORDER BY co.outcome_date DESC, co.created_at DESC
  `,
    [caseId]
  );
  return result.rows;
};

export const createCaseOutcomeQuery = async (
  db: Pool,
  caseId: string,
  data: CreateCaseOutcomeDTO,
  userId?: string
): Promise<CaseOutcomeEvent> => {
  const ownership = await requireCaseOwnership(db, caseId);
  const visibleToClient = resolveVisibleToClient({
    visible_to_client: data.visible_to_client,
    is_portal_visible: data.is_portal_visible,
  });

  const result = await db.query(
    `
    INSERT INTO case_outcomes (
      case_id,
      account_id,
      outcome_type,
      outcome_date,
      notes,
      visible_to_client,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $7)
    RETURNING *
  `,
    [
      caseId,
      ownership.account_id,
      data.outcome_type || null,
      data.outcome_date || null,
      data.notes || null,
      visibleToClient,
      userId || null,
    ]
  );

  return result.rows[0];
};

export const updateCaseOutcomeQuery = async (
  db: Pool,
  outcomeId: string,
  data: UpdateCaseOutcomeDTO,
  userId?: string
): Promise<CaseOutcomeEvent> => {
  const caseId = await requireCaseIdForOutcome(db, outcomeId);
  await requireCaseOwnership(db, caseId);

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

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

export const deleteCaseOutcomeQuery = async (db: Pool, outcomeId: string): Promise<boolean> => {
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

export const getCaseTopicDefinitionsQuery = async (db: Pool, caseId: string): Promise<CaseTopicDefinition[]> => {
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
  db: Pool,
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

export const getCaseTopicEventsQuery = async (db: Pool, caseId: string): Promise<CaseTopicEvent[]> => {
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
  db: Pool,
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

export const deleteCaseTopicEventQuery = async (db: Pool, topicEventId: string): Promise<boolean> => {
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
