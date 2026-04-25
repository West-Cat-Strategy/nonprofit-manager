import pool from '@config/database';
import type { Pool, PoolClient } from 'pg';
import { createCaseWorkflowArtifacts } from '@services/caseWorkflowService';
import { requireCaseOwnership } from '../queries/shared';
import type {
  CaseReassessmentCycle,
  CaseReassessmentCycleCompletionResult,
  CompleteCaseReassessmentDTO,
  CreateCaseReassessmentDTO,
  UpdateCaseReassessmentDTO,
} from '@app-types/case';

type PgExecutor = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

type CaseReassessmentRow = Omit<
  CaseReassessmentCycle,
  | 'earliest_review_date'
  | 'due_date'
  | 'latest_review_date'
  | 'completed_at'
  | 'created_at'
  | 'updated_at'
> & {
  earliest_review_date: string | Date | null;
  due_date: string | Date;
  latest_review_date: string | Date | null;
  completed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const REASSESSMENT_COLUMNS = `
  id,
  organization_id,
  case_id,
  follow_up_id,
  owner_user_id,
  status,
  title,
  summary,
  earliest_review_date,
  due_date,
  latest_review_date,
  completion_summary,
  cancellation_reason,
  completed_at,
  completed_by,
  created_by,
  updated_by,
  created_at,
  updated_at
`;

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
};

const toIsoDateTime = (value: string | Date | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  return value.toISOString();
};

const mapReassessmentRow = (row: CaseReassessmentRow): CaseReassessmentCycle => ({
  ...row,
  earliest_review_date: toIsoDate(row.earliest_review_date),
  due_date: toIsoDate(row.due_date) || '',
  latest_review_date: toIsoDate(row.latest_review_date),
  completed_at: toIsoDateTime(row.completed_at),
  created_at: toIsoDateTime(row.created_at) || '',
  updated_at: toIsoDateTime(row.updated_at) || '',
});

const normalizeOptionalText = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredText = (value: string, field: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw Object.assign(new Error(`${field} is required`), {
      statusCode: 400,
      code: 'validation_error',
    });
  }
  return trimmed;
};

const uniqueIds = (values: string[] = []): string[] => Array.from(new Set(values.filter(Boolean)));

const loadReassessmentForUpdate = async (
  executor: PgExecutor,
  input: {
    organizationId: string;
    caseId: string;
    reassessmentId: string;
  }
): Promise<CaseReassessmentRow | null> => {
  const result = await executor.query<CaseReassessmentRow>(
    `SELECT ${REASSESSMENT_COLUMNS}
     FROM case_reassessment_cycles
     WHERE organization_id = $1
       AND case_id = $2
       AND id = $3
     FOR UPDATE`,
    [input.organizationId, input.caseId, input.reassessmentId]
  );

  return result.rows[0] || null;
};

const insertLinkedFollowUp = async (
  executor: PgExecutor,
  input: {
    organizationId: string;
    caseId: string;
    userId: string;
    title: string;
    summary?: string | null;
    dueDate: string;
    ownerUserId?: string | null;
  }
): Promise<string> => {
  const result = await executor.query<{ id: string }>(
    `INSERT INTO follow_ups (
       organization_id,
       entity_type,
       entity_id,
       title,
       description,
       scheduled_date,
       frequency,
       status,
       assigned_to,
       created_by,
       modified_by
     )
     VALUES ($1, 'case', $2, $3, $4, $5, 'once', 'scheduled', $6, $7, $7)
     RETURNING id`,
    [
      input.organizationId,
      input.caseId,
      input.title,
      input.summary || null,
      input.dueDate,
      input.ownerUserId || null,
      input.userId,
    ]
  );

  return result.rows[0].id;
};

const insertReassessment = async (
  executor: PgExecutor,
  input: {
    organizationId: string;
    caseId: string;
    followUpId: string;
    userId: string;
    title: string;
    summary?: string | null;
    earliestReviewDate?: string | null;
    dueDate: string;
    latestReviewDate?: string | null;
    ownerUserId?: string | null;
  }
): Promise<CaseReassessmentCycle> => {
  const result = await executor.query<CaseReassessmentRow>(
    `INSERT INTO case_reassessment_cycles (
       organization_id,
       case_id,
       follow_up_id,
       owner_user_id,
       status,
       title,
       summary,
       earliest_review_date,
       due_date,
       latest_review_date,
       created_by,
       updated_by
     )
     VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, $7, $8, $9, $10, $10)
     RETURNING ${REASSESSMENT_COLUMNS}`,
    [
      input.organizationId,
      input.caseId,
      input.followUpId,
      input.ownerUserId || null,
      input.title,
      input.summary || null,
      input.earliestReviewDate || null,
      input.dueDate,
      input.latestReviewDate || null,
      input.userId,
    ]
  );

  return mapReassessmentRow(result.rows[0]);
};

export class CaseReassessmentsRepository {
  async list(
    caseId: string,
    organizationId: string
  ): Promise<CaseReassessmentCycle[]> {
    await requireCaseOwnership(pool, caseId, organizationId);

    const result = await pool.query<CaseReassessmentRow>(
      `SELECT ${REASSESSMENT_COLUMNS}
       FROM case_reassessment_cycles
       WHERE organization_id = $1
         AND case_id = $2
       ORDER BY due_date ASC, created_at DESC`,
      [organizationId, caseId]
    );

    return result.rows.map(mapReassessmentRow);
  }

  async create(
    caseId: string,
    organizationId: string,
    userId: string,
    data: CreateCaseReassessmentDTO
  ): Promise<CaseReassessmentCycle> {
    const title = normalizeRequiredText(data.title, 'title');
    const summary = normalizeOptionalText(data.summary) ?? null;
    const ownerUserId = data.owner_user_id === undefined ? userId : data.owner_user_id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ownership = await requireCaseOwnership(client, caseId, organizationId);
      const resolvedOrganizationId = ownership.account_id || organizationId;
      const followUpId = await insertLinkedFollowUp(client, {
        organizationId: resolvedOrganizationId,
        caseId,
        userId,
        title,
        summary,
        dueDate: data.due_date,
        ownerUserId,
      });

      const reassessment = await insertReassessment(client, {
        organizationId: resolvedOrganizationId,
        caseId,
        followUpId,
        userId,
        title,
        summary,
        earliestReviewDate: data.earliest_review_date || null,
        dueDate: data.due_date,
        latestReviewDate: data.latest_review_date || null,
        ownerUserId,
      });

      await client.query('COMMIT');
      return reassessment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    caseId: string,
    reassessmentId: string,
    organizationId: string,
    userId: string,
    data: UpdateCaseReassessmentDTO
  ): Promise<CaseReassessmentCycle> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await requireCaseOwnership(client, caseId, organizationId);
      const current = await loadReassessmentForUpdate(client, {
        organizationId,
        caseId,
        reassessmentId,
      });

      if (!current) {
        throw Object.assign(new Error('Reassessment cycle not found'), {
          statusCode: 404,
          code: 'not_found',
        });
      }

      if (current.status === 'completed' || current.status === 'cancelled') {
        throw Object.assign(new Error('Completed or cancelled reassessments cannot be updated'), {
          statusCode: 409,
          code: 'conflict',
        });
      }

      const updates: string[] = [];
      const values: unknown[] = [organizationId, caseId, reassessmentId];
      const addUpdate = (field: string, value: unknown): void => {
        values.push(value);
        updates.push(`${field} = $${values.length}`);
      };

      if (data.title !== undefined) addUpdate('title', normalizeRequiredText(data.title, 'title'));
      if (data.summary !== undefined) addUpdate('summary', normalizeOptionalText(data.summary) ?? null);
      if (data.earliest_review_date !== undefined) {
        addUpdate('earliest_review_date', data.earliest_review_date);
      }
      if (data.due_date !== undefined) addUpdate('due_date', data.due_date);
      if (data.latest_review_date !== undefined) addUpdate('latest_review_date', data.latest_review_date);
      if (data.owner_user_id !== undefined) addUpdate('owner_user_id', data.owner_user_id);
      if (data.status !== undefined) addUpdate('status', data.status);

      addUpdate('updated_by', userId);
      updates.push('updated_at = NOW()');

      const updatedResult = await client.query<CaseReassessmentRow>(
        `UPDATE case_reassessment_cycles
         SET ${updates.join(', ')}
         WHERE organization_id = $1
           AND case_id = $2
           AND id = $3
         RETURNING ${REASSESSMENT_COLUMNS}`,
        values
      );

      const updated = updatedResult.rows[0];
      await client.query(
        `UPDATE follow_ups
         SET title = $4,
             description = $5,
             scheduled_date = $6,
             assigned_to = $7,
             modified_by = $8,
             updated_at = NOW()
         WHERE organization_id = $1
           AND entity_type = 'case'
           AND entity_id = $2
           AND id = $3`,
        [
          organizationId,
          caseId,
          updated.follow_up_id,
          updated.title,
          updated.summary,
          updated.due_date,
          updated.owner_user_id,
          userId,
        ]
      );

      await client.query('COMMIT');
      return mapReassessmentRow(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async complete(
    caseId: string,
    reassessmentId: string,
    organizationId: string,
    userId: string,
    data: CompleteCaseReassessmentDTO
  ): Promise<CaseReassessmentCycleCompletionResult> {
    const completionSummary = normalizeRequiredText(
      data.completion_summary,
      'completion_summary'
    );
    const outcomeDefinitionIds = uniqueIds(data.outcome_definition_ids);
    if (outcomeDefinitionIds.length === 0) {
      throw Object.assign(new Error('Case reassessment completion requires at least one outcome definition'), {
        statusCode: 400,
        code: 'validation_error',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownership = await requireCaseOwnership(client, caseId, organizationId);
      const current = await loadReassessmentForUpdate(client, {
        organizationId,
        caseId,
        reassessmentId,
      });

      if (!current) {
        throw Object.assign(new Error('Reassessment cycle not found'), {
          statusCode: 404,
          code: 'not_found',
        });
      }

      if (current.status === 'completed' || current.status === 'cancelled') {
        throw Object.assign(new Error('Reassessment cycle is already closed'), {
          statusCode: 409,
          code: 'conflict',
        });
      }

      await client.query(
        `UPDATE follow_ups
         SET status = 'completed',
             completed_date = NOW(),
             completed_notes = $4,
             modified_by = $5,
             updated_at = NOW()
         WHERE organization_id = $1
           AND entity_type = 'case'
           AND entity_id = $2
           AND id = $3`,
        [organizationId, caseId, current.follow_up_id, completionSummary, userId]
      );

      await client.query(
        `DELETE FROM follow_up_notifications
         WHERE follow_up_id = $1
           AND status IN ('pending', 'processing')`,
        [current.follow_up_id]
      );

      await createCaseWorkflowArtifacts(client, {
        caseId,
        userId,
        note: {
          noteType: 'update',
          subject: 'Case reassessment completed',
          content: completionSummary,
          sourceEntityType: 'follow_up',
          sourceEntityId: current.follow_up_id,
        },
        outcomes: {
          outcomeDefinitionIds,
          notes: completionSummary,
          visibleToClient: Boolean(data.outcome_visibility),
          workflowStage: 'follow_up',
          sourceEntityType: 'follow_up',
          sourceEntityId: current.follow_up_id,
        },
      });

      const completedResult = await client.query<CaseReassessmentRow>(
        `UPDATE case_reassessment_cycles
         SET status = 'completed',
             completion_summary = $4,
             completed_at = NOW(),
             completed_by = $5,
             updated_by = $5,
             updated_at = NOW()
         WHERE organization_id = $1
           AND case_id = $2
           AND id = $3
         RETURNING ${REASSESSMENT_COLUMNS}`,
        [organizationId, caseId, reassessmentId, completionSummary, userId]
      );

      let nextReassessment: CaseReassessmentCycle | null = null;
      if (data.next_due_date) {
        const nextTitle = normalizeRequiredText(
          data.next_title || current.title,
          'next_title'
        );
        const nextSummary =
          data.next_summary === undefined
            ? current.summary
            : normalizeOptionalText(data.next_summary) ?? null;
        const nextOwnerUserId =
          data.next_owner_user_id === undefined ? current.owner_user_id : data.next_owner_user_id;
        const resolvedOrganizationId = ownership.account_id || organizationId;
        const nextFollowUpId = await insertLinkedFollowUp(client, {
          organizationId: resolvedOrganizationId,
          caseId,
          userId,
          title: nextTitle,
          summary: nextSummary,
          dueDate: data.next_due_date,
          ownerUserId: nextOwnerUserId,
        });

        nextReassessment = await insertReassessment(client, {
          organizationId: resolvedOrganizationId,
          caseId,
          followUpId: nextFollowUpId,
          userId,
          title: nextTitle,
          summary: nextSummary,
          earliestReviewDate: data.next_earliest_review_date || null,
          dueDate: data.next_due_date,
          latestReviewDate: data.next_latest_review_date || null,
          ownerUserId: nextOwnerUserId,
        });
      }

      await client.query('COMMIT');
      return {
        reassessment: mapReassessmentRow(completedResult.rows[0]),
        next_reassessment: nextReassessment,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancel(
    caseId: string,
    reassessmentId: string,
    organizationId: string,
    userId: string,
    cancellationReason: string
  ): Promise<CaseReassessmentCycle> {
    const normalizedReason = normalizeRequiredText(cancellationReason, 'cancellation_reason');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await requireCaseOwnership(client, caseId, organizationId);
      const current = await loadReassessmentForUpdate(client, {
        organizationId,
        caseId,
        reassessmentId,
      });

      if (!current) {
        throw Object.assign(new Error('Reassessment cycle not found'), {
          statusCode: 404,
          code: 'not_found',
        });
      }

      if (current.status === 'completed' || current.status === 'cancelled') {
        throw Object.assign(new Error('Reassessment cycle is already closed'), {
          statusCode: 409,
          code: 'conflict',
        });
      }

      await client.query(
        `UPDATE follow_ups
         SET status = 'cancelled',
             completed_notes = $4,
             modified_by = $5,
             updated_at = NOW()
         WHERE organization_id = $1
           AND entity_type = 'case'
           AND entity_id = $2
           AND id = $3`,
        [organizationId, caseId, current.follow_up_id, normalizedReason, userId]
      );

      await client.query(
        `DELETE FROM follow_up_notifications
         WHERE follow_up_id = $1
           AND status IN ('pending', 'processing')`,
        [current.follow_up_id]
      );

      await createCaseWorkflowArtifacts(client, {
        caseId,
        userId,
        note: {
          noteType: 'update',
          subject: 'Case reassessment cancelled',
          content: normalizedReason,
          sourceEntityType: 'follow_up',
          sourceEntityId: current.follow_up_id,
        },
      });

      const cancelledResult = await client.query<CaseReassessmentRow>(
        `UPDATE case_reassessment_cycles
         SET status = 'cancelled',
             cancellation_reason = $4,
             updated_by = $5,
             updated_at = NOW()
         WHERE organization_id = $1
           AND case_id = $2
           AND id = $3
         RETURNING ${REASSESSMENT_COLUMNS}`,
        [organizationId, caseId, reassessmentId, normalizedReason, userId]
      );

      await client.query('COMMIT');
      return mapReassessmentRow(cancelledResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
