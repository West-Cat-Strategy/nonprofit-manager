import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  CaseOutcomeEntrySource,
  CaseOutcomeWorkflowStage,
  CaseSourceEntityType,
  NoteType,
} from '@app-types/case';
import { requireCaseOwnership } from '@modules/cases/queries/shared';
import { getStaffThread } from '@modules/portal/services/portalMessagingService';
import { publishPortalThreadUpdated } from '@services/portalRealtimeService';

type PgExecutor = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

interface OutcomeDefinitionRow {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
}

export interface CreateCaseWorkflowArtifactsInput {
  caseId: string;
  userId?: string | null;
  note: {
    noteType: NoteType;
    content: string;
    subject?: string | null;
    category?: string | null;
    previousStatusId?: string | null;
    newStatusId?: string | null;
    visibleToClient?: boolean;
    isImportant?: boolean;
    sourceEntityType?: CaseSourceEntityType | null;
    sourceEntityId?: string | null;
  };
  outcomes?: {
    outcomeDefinitionIds: string[];
    notes?: string | null;
    visibleToClient?: boolean;
    workflowStage: CaseOutcomeWorkflowStage;
    sourceEntityType?: CaseSourceEntityType | null;
    sourceEntityId?: string | null;
    outcomeDate?: string | Date | null;
    entrySource?: CaseOutcomeEntrySource;
  };
}

export interface ResolveCaseConversationInput {
  caseId: string;
  threadId: string;
  userId: string;
  resolutionNote: string;
  outcomeDefinitionIds: string[];
  closeStatus: 'closed' | 'archived';
  visibleToClient: boolean;
}

const normalizeRequiredText = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw Object.assign(new Error(`${field} is required`), {
      statusCode: 400,
      code: 'validation_error',
    });
  }
  return normalized;
};

const uniqueIds = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const resolveOutcomeDefinitions = async (
  executor: PgExecutor,
  outcomeDefinitionIds: string[]
): Promise<OutcomeDefinitionRow[]> => {
  const normalizedIds = uniqueIds(outcomeDefinitionIds);
  if (normalizedIds.length === 0) {
    return [];
  }

  const result = await executor.query<OutcomeDefinitionRow>(
    `
    SELECT id, key, name, is_active
    FROM outcome_definitions
    WHERE id = ANY($1::uuid[])
  `,
    [normalizedIds]
  );

  if (result.rows.length !== normalizedIds.length) {
    throw Object.assign(new Error('One or more outcome definitions were not found'), {
      statusCode: 404,
      code: 'not_found',
    });
  }

  const inactiveDefinition = result.rows.find((row) => !row.is_active);
  if (inactiveDefinition) {
    throw Object.assign(new Error(`Outcome definition ${inactiveDefinition.name} is inactive`), {
      statusCode: 409,
      code: 'conflict',
    });
  }

  return result.rows;
};

export const createCaseWorkflowArtifacts = async (
  executor: PgExecutor,
  input: CreateCaseWorkflowArtifactsInput
): Promise<{ noteId: string; outcomeIds: string[] }> => {
  const ownership = await requireCaseOwnership(executor as PoolClient, input.caseId);
  const visibleToClient = Boolean(input.note.visibleToClient);
  const noteContent = normalizeRequiredText(input.note.content, 'note content');

  const noteResult = await executor.query<{ id: string }>(
    `
    INSERT INTO case_notes (
      case_id,
      note_type,
      subject,
      category,
      previous_status_id,
      new_status_id,
      content,
      is_internal,
      visible_to_client,
      is_important,
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
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12::uuid,
      $13,
      $13
    )
    RETURNING id
  `,
    [
      input.caseId,
      input.note.noteType,
      input.note.subject || null,
      input.note.category || null,
      input.note.previousStatusId || null,
      input.note.newStatusId || null,
      noteContent,
      !visibleToClient,
      visibleToClient,
      Boolean(input.note.isImportant),
      input.note.sourceEntityType || null,
      input.note.sourceEntityId || null,
      input.userId || null,
    ]
  );

  const noteId = noteResult.rows[0]?.id;
  if (!noteId) {
    throw new Error('Failed to create case workflow note');
  }

  const outcomeIds: string[] = [];
  const outcomePayload = input.outcomes;
  if (!outcomePayload || outcomePayload.outcomeDefinitionIds.length === 0) {
    return { noteId, outcomeIds };
  }

  const definitions = await resolveOutcomeDefinitions(executor, outcomePayload.outcomeDefinitionIds);

  for (const definition of definitions) {
    const insertedOutcome = await executor.query<{ id: string }>(
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
        $8,
        $9,
        $10,
        $11::uuid,
        $12,
        $12
      )
      RETURNING id
    `,
      [
        input.caseId,
        ownership.account_id,
        definition.name,
        definition.id,
        outcomePayload.outcomeDate || null,
        outcomePayload.notes || noteContent,
        Boolean(outcomePayload.visibleToClient),
        outcomePayload.entrySource || 'manual',
        outcomePayload.workflowStage,
        outcomePayload.sourceEntityType || null,
        outcomePayload.sourceEntityId || null,
        input.userId || null,
      ]
    );

    if (insertedOutcome.rows[0]?.id) {
      outcomeIds.push(insertedOutcome.rows[0].id);
    }
  }

  return { noteId, outcomeIds };
};

export const resolveCaseConversation = async (
  input: ResolveCaseConversationInput
): Promise<Awaited<ReturnType<typeof getStaffThread>>> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resolutionNote = normalizeRequiredText(input.resolutionNote, 'resolution_note');
    const outcomeDefinitionIds = uniqueIds(input.outcomeDefinitionIds);
    if (outcomeDefinitionIds.length === 0) {
      throw Object.assign(new Error('At least one outcome definition is required'), {
        statusCode: 400,
        code: 'validation_error',
      });
    }

    const threadResult = await client.query<{
      id: string;
      case_id: string | null;
      contact_id: string;
      status: 'open' | 'closed' | 'archived';
    }>(
      `
      SELECT id, case_id, contact_id, status
      FROM portal_threads
      WHERE id = $1
        AND case_id = $2
      FOR UPDATE
    `,
      [input.threadId, input.caseId]
    );

    const thread = threadResult.rows[0];
    if (!thread) {
      throw Object.assign(new Error('Conversation not found for this case'), {
        statusCode: 404,
        code: 'not_found',
      });
    }

    await createCaseWorkflowArtifacts(client, {
      caseId: input.caseId,
      userId: input.userId,
      note: {
        noteType: 'portal_message',
        subject: 'Portal conversation resolved',
        content: resolutionNote,
        visibleToClient: input.visibleToClient,
        sourceEntityType: 'portal_thread',
        sourceEntityId: input.threadId,
      },
      outcomes: {
        outcomeDefinitionIds,
        notes: resolutionNote,
        visibleToClient: input.visibleToClient,
        workflowStage: 'conversation',
        sourceEntityType: 'portal_thread',
        sourceEntityId: input.threadId,
      },
    });

    await client.query(
      `
      UPDATE portal_messages
      SET read_by_staff_at = COALESCE(read_by_staff_at, NOW())
      WHERE thread_id = $1
        AND sender_type = 'portal'
        AND read_by_staff_at IS NULL
    `,
      [input.threadId]
    );

    await client.query(
      `
      UPDATE portal_threads
      SET status = $1,
          closed_at = NOW(),
          closed_by = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
      [input.closeStatus, input.userId, input.threadId]
    );

    await client.query('COMMIT');

    const updatedThread = await getStaffThread(input.threadId);
    if (updatedThread?.thread) {
      publishPortalThreadUpdated({
        entityId: updatedThread.thread.id,
        caseId: updatedThread.thread.case_id,
        status: updatedThread.thread.status,
        actorType: 'staff',
        source: 'case.portal.conversation.resolve',
        contactId: updatedThread.thread.contact_id,
      });
    }

    return updatedThread;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }

    logger.error('Failed to resolve case conversation', {
      error,
      caseId: input.caseId,
      threadId: input.threadId,
    });
    throw error;
  } finally {
    client.release();
  }
};
