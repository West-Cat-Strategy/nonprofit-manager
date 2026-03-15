import { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  InteractionOutcomeImpact,
  InteractionOutcomeImpactInput,
  UpdateInteractionOutcomeImpactsDTO,
} from '@app-types/outcomes';

const DEFAULT_ATTRIBUTION = 'DIRECT';

type PgExecutor = Pool | PoolClient;

interface ContactNoteContext {
  interactionId: string;
  caseId: string;
  accountId: string | null;
  visibleToClient: boolean;
  outcomeDate: Date | string;
  createdBy: string | null;
}

interface OutcomeDefinitionLookup {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
}

const mapImpactRow = (row: any): InteractionOutcomeImpact => ({
  id: row.id,
  interaction_id: row.interaction_id,
  outcome_definition_id: row.outcome_definition_id,
  impact: row.impact,
  attribution: row.attribution,
  intensity: row.intensity,
  evidence_note: row.evidence_note,
  created_by_user_id: row.created_by_user_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
  outcome_definition: row.outcome_definition,
});

export class ContactNoteOutcomeImpactService {
  constructor(private readonly pool: Pool) {}

  private async ensureCaseLinkedContactNote(
    executor: PgExecutor,
    interactionId: string
  ): Promise<ContactNoteContext> {
    const noteResult = await executor.query(
      `
      SELECT
        cn.id AS interaction_id,
        cn.case_id,
        c.account_id,
        cn.is_portal_visible,
        cn.created_at,
        cn.created_by
      FROM contact_notes cn
      LEFT JOIN cases c
        ON c.id = cn.case_id
      WHERE cn.id = $1
      LIMIT 1
    `,
      [interactionId]
    );

    const row = noteResult.rows[0] as
      | {
          interaction_id: string;
          case_id: string | null;
          account_id: string | null;
          is_portal_visible: boolean;
          created_at: Date | string;
          created_by: string | null;
        }
      | undefined;

    if (!row) {
      throw Object.assign(new Error('Contact note not found'), {
        statusCode: 404,
        code: 'not_found',
      });
    }

    if (!row.case_id) {
      throw Object.assign(new Error('A case-linked contact note is required for outcome tagging'), {
        statusCode: 400,
        code: 'bad_request',
      });
    }

    return {
      interactionId: row.interaction_id,
      caseId: row.case_id,
      accountId: row.account_id,
      visibleToClient: Boolean(row.is_portal_visible),
      outcomeDate: row.created_at,
      createdBy: row.created_by,
    };
  }

  private async validateOutcomeDefinitionIds(
    executor: PgExecutor,
    impacts: InteractionOutcomeImpactInput[]
  ): Promise<Map<string, OutcomeDefinitionLookup>> {
    const definitionsById = new Map<string, OutcomeDefinitionLookup>();

    if (impacts.length === 0) {
      return definitionsById;
    }

    const outcomeDefinitionIds = Array.from(new Set(impacts.map((impact) => impact.outcomeDefinitionId)));

    const result = await executor.query<OutcomeDefinitionLookup>(
      `
      SELECT id, key, name, is_active
      FROM outcome_definitions
      WHERE id = ANY($1::uuid[])
    `,
      [outcomeDefinitionIds]
    );

    if (result.rows.length !== outcomeDefinitionIds.length) {
      const foundIds = new Set(result.rows.map((row) => row.id));
      const missingIds = outcomeDefinitionIds.filter((id) => !foundIds.has(id));

      throw Object.assign(new Error(`Outcome definition not found: ${missingIds.join(', ')}`), {
        statusCode: 404,
        code: 'not_found',
      });
    }

    const inactiveIds = result.rows.filter((row) => !row.is_active).map((row) => row.id);
    if (inactiveIds.length > 0) {
      throw Object.assign(new Error(`Outcome definition is inactive: ${inactiveIds.join(', ')}`), {
        statusCode: 409,
        code: 'conflict',
      });
    }

    for (const definition of result.rows) {
      definitionsById.set(definition.id, definition);
    }

    return definitionsById;
  }

  private async fetchContactNoteOutcomesByInteractionId(
    executor: PgExecutor,
    interactionId: string
  ): Promise<InteractionOutcomeImpact[]> {
    const result = await executor.query(
      `
      SELECT
        cnoi.*,
        json_build_object(
          'id', od.id,
          'key', od.key,
          'name', od.name,
          'description', od.description,
          'category', od.category,
          'is_active', od.is_active,
          'is_reportable', od.is_reportable,
          'sort_order', od.sort_order,
          'created_at', od.created_at,
          'updated_at', od.updated_at
        ) AS outcome_definition
      FROM contact_note_outcome_impacts cnoi
      INNER JOIN outcome_definitions od
        ON od.id = cnoi.outcome_definition_id
      WHERE cnoi.interaction_id = $1
      ORDER BY od.sort_order ASC, od.name ASC
    `,
      [interactionId]
    );

    return result.rows.map(mapImpactRow);
  }

  private async syncCaseOutcomes(
    executor: PgExecutor,
    context: ContactNoteContext,
    impacts: InteractionOutcomeImpactInput[],
    definitionsById: Map<string, OutcomeDefinitionLookup>,
    mode: 'replace' | 'merge',
    userId?: string
  ): Promise<void> {
    const positiveImpacts = impacts.filter((impactInput) => impactInput.impact !== false);

    for (const impactInput of positiveImpacts) {
      const definition = definitionsById.get(impactInput.outcomeDefinitionId);
      if (!definition) {
        continue;
      }

      await executor.query(
        `
        INSERT INTO case_outcomes (
          case_id,
          account_id,
          outcome_type,
          outcome_definition_id,
          source_interaction_id,
          source_entity_type,
          source_entity_id,
          entry_source,
          workflow_stage,
          outcome_date,
          notes,
          visible_to_client,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, NULL, 'contact_note', $5, 'interaction_sync', 'interaction', $6::date, $7, $8, $9, $9)
        ON CONFLICT (source_entity_id, outcome_definition_id)
        WHERE source_entity_type = 'contact_note'
          AND source_entity_id IS NOT NULL
          AND outcome_definition_id IS NOT NULL
          AND entry_source = 'interaction_sync'
        DO UPDATE SET
          case_id = EXCLUDED.case_id,
          account_id = EXCLUDED.account_id,
          outcome_type = EXCLUDED.outcome_type,
          source_interaction_id = NULL,
          source_entity_type = EXCLUDED.source_entity_type,
          source_entity_id = EXCLUDED.source_entity_id,
          outcome_date = EXCLUDED.outcome_date,
          notes = EXCLUDED.notes,
          visible_to_client = EXCLUDED.visible_to_client,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = EXCLUDED.updated_by,
          entry_source = 'interaction_sync',
          workflow_stage = 'interaction'
      `,
        [
          context.caseId,
          context.accountId,
          definition.name,
          definition.id,
          context.interactionId,
          context.outcomeDate,
          impactInput.evidenceNote ?? null,
          context.visibleToClient,
          userId ?? context.createdBy,
        ]
      );
    }

    const explicitlyNegativeOutcomeIds = Array.from(
      new Set(
        impacts
          .filter((impactInput) => impactInput.impact === false)
          .map((impactInput) => impactInput.outcomeDefinitionId)
      )
    );

    if (explicitlyNegativeOutcomeIds.length > 0) {
      await executor.query(
        `
        DELETE FROM case_outcomes
        WHERE source_entity_type = 'contact_note'
          AND source_entity_id = $1
          AND entry_source = 'interaction_sync'
          AND outcome_definition_id = ANY($2::uuid[])
      `,
        [context.interactionId, explicitlyNegativeOutcomeIds]
      );
    }

    if (mode === 'replace') {
      const syncedOutcomeIds = Array.from(
        new Set(positiveImpacts.map((impactInput) => impactInput.outcomeDefinitionId))
      );

      if (syncedOutcomeIds.length > 0) {
        await executor.query(
          `
          DELETE FROM case_outcomes
          WHERE source_entity_type = 'contact_note'
            AND source_entity_id = $1
            AND entry_source = 'interaction_sync'
            AND NOT (outcome_definition_id = ANY($2::uuid[]))
        `,
          [context.interactionId, syncedOutcomeIds]
        );
      } else {
        await executor.query(
          `
          DELETE FROM case_outcomes
          WHERE source_entity_type = 'contact_note'
            AND source_entity_id = $1
            AND entry_source = 'interaction_sync'
        `,
          [context.interactionId]
        );
      }
    }
  }

  private async persistContactNoteOutcomes(
    executor: PgExecutor,
    context: ContactNoteContext,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<InteractionOutcomeImpact[]> {
    const mode = payload.mode || 'replace';
    const impacts = payload.impacts || [];
    const definitionsById = await this.validateOutcomeDefinitionIds(executor, impacts);

    const touchedOutcomeIds: string[] = [];

    for (const impactInput of impacts) {
      touchedOutcomeIds.push(impactInput.outcomeDefinitionId);

      await executor.query(
        `
        INSERT INTO contact_note_outcome_impacts (
          interaction_id,
          outcome_definition_id,
          impact,
          attribution,
          intensity,
          evidence_note,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (interaction_id, outcome_definition_id)
        DO UPDATE SET
          impact = EXCLUDED.impact,
          attribution = EXCLUDED.attribution,
          intensity = EXCLUDED.intensity,
          evidence_note = EXCLUDED.evidence_note,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          context.interactionId,
          impactInput.outcomeDefinitionId,
          impactInput.impact ?? true,
          impactInput.attribution ?? DEFAULT_ATTRIBUTION,
          impactInput.intensity ?? null,
          impactInput.evidenceNote ?? null,
          userId ?? null,
        ]
      );
    }

    if (mode === 'replace') {
      if (touchedOutcomeIds.length > 0) {
        await executor.query(
          `
          DELETE FROM contact_note_outcome_impacts
          WHERE interaction_id = $1
            AND NOT (outcome_definition_id = ANY($2::uuid[]))
        `,
          [context.interactionId, touchedOutcomeIds]
        );
      } else {
        await executor.query(
          `
          DELETE FROM contact_note_outcome_impacts
          WHERE interaction_id = $1
        `,
          [context.interactionId]
        );
      }
    }

    await this.syncCaseOutcomes(executor, context, impacts, definitionsById, mode, userId);

    return this.fetchContactNoteOutcomesByInteractionId(executor, context.interactionId);
  }

  async getContactNoteOutcomes(interactionId: string): Promise<InteractionOutcomeImpact[]> {
    await this.ensureCaseLinkedContactNote(this.pool, interactionId);
    return this.fetchContactNoteOutcomesByInteractionId(this.pool, interactionId);
  }

  async saveContactNoteOutcomes(
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<InteractionOutcomeImpact[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const context = await this.ensureCaseLinkedContactNote(client, interactionId);
      const savedImpacts = await this.persistContactNoteOutcomes(client, context, payload, userId);

      await client.query('COMMIT');

      return savedImpacts;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
      logger.error('Failed to save contact note outcomes', {
        error,
        interactionId,
        mode: payload.mode || 'replace',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async saveContactNoteOutcomesWithExecutor(
    executor: PgExecutor,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<InteractionOutcomeImpact[]> {
    const context = await this.ensureCaseLinkedContactNote(executor, interactionId);
    return this.persistContactNoteOutcomes(executor, context, payload, userId);
  }
}

const contactNoteOutcomeImpactServiceInstance = new ContactNoteOutcomeImpactService(pool);

export const getContactNoteOutcomes =
  contactNoteOutcomeImpactServiceInstance.getContactNoteOutcomes.bind(contactNoteOutcomeImpactServiceInstance);
export const saveContactNoteOutcomes =
  contactNoteOutcomeImpactServiceInstance.saveContactNoteOutcomes.bind(contactNoteOutcomeImpactServiceInstance);
export const saveContactNoteOutcomesWithExecutor =
  contactNoteOutcomeImpactServiceInstance.saveContactNoteOutcomesWithExecutor.bind(contactNoteOutcomeImpactServiceInstance);

export default contactNoteOutcomeImpactServiceInstance;
