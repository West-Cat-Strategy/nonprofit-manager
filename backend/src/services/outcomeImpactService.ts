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

export class OutcomeImpactService {
  constructor(private readonly pool: Pool) {}

  private async ensureInteractionBelongsToCase(
    executor: PgExecutor,
    caseId: string,
    interactionId: string
  ): Promise<void> {
    const interactionResult = await executor.query(
      `
      SELECT id
      FROM case_notes
      WHERE id = $1
        AND case_id = $2
      LIMIT 1
    `,
      [interactionId, caseId]
    );

    if (!interactionResult.rows[0]) {
      throw Object.assign(new Error('Interaction not found for case'), {
        statusCode: 404,
        code: 'not_found',
      });
    }
  }

  private async validateOutcomeDefinitionIds(executor: PgExecutor, impacts: InteractionOutcomeImpactInput[]) {
    if (impacts.length === 0) {
      return;
    }

    const outcomeDefinitionIds = Array.from(new Set(impacts.map((impact) => impact.outcomeDefinitionId)));

    const result = await executor.query(
      `
      SELECT id
      FROM outcome_definitions
      WHERE id = ANY($1::uuid[])
    `,
      [outcomeDefinitionIds]
    );

    if (result.rows.length !== outcomeDefinitionIds.length) {
      const foundIds = new Set(result.rows.map((row) => row.id as string));
      const missingIds = outcomeDefinitionIds.filter((id) => !foundIds.has(id));

      throw Object.assign(new Error(`Outcome definition not found: ${missingIds.join(', ')}`), {
        statusCode: 404,
        code: 'not_found',
      });
    }
  }

  private async fetchInteractionOutcomesByInteractionId(
    executor: PgExecutor,
    interactionId: string
  ): Promise<InteractionOutcomeImpact[]> {
    const result = await executor.query(
      `
      SELECT
        ioi.*,
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
      FROM interaction_outcome_impacts ioi
      INNER JOIN outcome_definitions od
        ON od.id = ioi.outcome_definition_id
      WHERE ioi.interaction_id = $1
      ORDER BY od.sort_order ASC, od.name ASC
    `,
      [interactionId]
    );

    return result.rows.map(mapImpactRow);
  }

  async getInteractionOutcomes(caseId: string, interactionId: string): Promise<InteractionOutcomeImpact[]> {
    await this.ensureInteractionBelongsToCase(this.pool, caseId, interactionId);

    return this.fetchInteractionOutcomesByInteractionId(this.pool, interactionId);
  }

  async saveInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<InteractionOutcomeImpact[]> {
    const mode = payload.mode || 'replace';
    const impacts = payload.impacts || [];

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await this.ensureInteractionBelongsToCase(client, caseId, interactionId);
      await this.validateOutcomeDefinitionIds(client, impacts);

      const touchedOutcomeIds: string[] = [];

      for (const impactInput of impacts) {
        touchedOutcomeIds.push(impactInput.outcomeDefinitionId);

        await client.query(
          `
          INSERT INTO interaction_outcome_impacts (
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
            interactionId,
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
          await client.query(
            `
            DELETE FROM interaction_outcome_impacts
            WHERE interaction_id = $1
              AND NOT (outcome_definition_id = ANY($2::uuid[]))
          `,
            [interactionId, touchedOutcomeIds]
          );
        } else {
          await client.query(
            `
            DELETE FROM interaction_outcome_impacts
            WHERE interaction_id = $1
          `,
            [interactionId]
          );
        }
      }

      const savedImpacts = await this.fetchInteractionOutcomesByInteractionId(client, interactionId);

      await client.query('COMMIT');

      return savedImpacts;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
      logger.error('Failed to save interaction outcomes', {
        error,
        caseId,
        interactionId,
        mode,
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

const outcomeImpactServiceInstance = new OutcomeImpactService(pool);

export const getInteractionOutcomes = outcomeImpactServiceInstance.getInteractionOutcomes.bind(
  outcomeImpactServiceInstance
);
export const saveInteractionOutcomes = outcomeImpactServiceInstance.saveInteractionOutcomes.bind(
  outcomeImpactServiceInstance
);

export default outcomeImpactServiceInstance;
