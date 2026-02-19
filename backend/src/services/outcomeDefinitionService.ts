import { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  CreateOutcomeDefinitionDTO,
  OutcomeDefinition,
  ReorderOutcomeDefinitionsDTO,
  UpdateOutcomeDefinitionDTO,
} from '@app-types/outcomes';

const normalizeKey = (value: string): string => value.trim().toLowerCase().replace(/[-\s]+/g, '_');

export class OutcomeDefinitionService {
  constructor(private readonly pool: Pool) {}

  async listOutcomeDefinitions(includeInactive: boolean = false): Promise<OutcomeDefinition[]> {
    const params: unknown[] = [];
    let whereClause = '';

    if (!includeInactive) {
      params.push(true);
      whereClause = `WHERE is_active = $${params.length}`;
    }

    const result = await this.pool.query<OutcomeDefinition>(
      `
      SELECT *
      FROM outcome_definitions
      ${whereClause}
      ORDER BY sort_order ASC, name ASC
    `,
      params
    );

    return result.rows;
  }

  async createOutcomeDefinition(data: CreateOutcomeDefinitionDTO): Promise<OutcomeDefinition> {
    const key = normalizeKey(data.key);

    try {
      const result = await this.pool.query<OutcomeDefinition>(
        `
        INSERT INTO outcome_definitions (key, name, description, category, is_active, is_reportable, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          key,
          data.name.trim(),
          data.description ?? null,
          data.category ?? null,
          data.isActive ?? true,
          data.isReportable ?? true,
          data.sortOrder ?? 0,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '23505') {
        throw Object.assign(new Error(`Outcome key '${key}' already exists`), {
          statusCode: 409,
          code: 'conflict',
        });
      }
      throw error;
    }
  }

  async updateOutcomeDefinition(id: string, data: UpdateOutcomeDefinitionDTO): Promise<OutcomeDefinition | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.key !== undefined) {
      fields.push(`key = $${idx++}`);
      values.push(normalizeKey(data.key));
    }

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }

    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(data.category);
    }

    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }

    if (data.isReportable !== undefined) {
      fields.push(`is_reportable = $${idx++}`);
      values.push(data.isReportable);
    }

    if (data.sortOrder !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(data.sortOrder);
    }

    if (fields.length === 0) {
      return this.getOutcomeDefinitionById(id);
    }

    values.push(id);

    try {
      const result = await this.pool.query<OutcomeDefinition>(
        `
        UPDATE outcome_definitions
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${idx}
        RETURNING *
      `,
        values
      );

      return result.rows[0] || null;
    } catch (error: any) {
      if (error?.code === '23505') {
        throw Object.assign(new Error('Outcome key already exists'), {
          statusCode: 409,
          code: 'conflict',
        });
      }
      throw error;
    }
  }

  async setOutcomeDefinitionActive(id: string, isActive: boolean): Promise<OutcomeDefinition | null> {
    const result = await this.pool.query<OutcomeDefinition>(
      `
      UPDATE outcome_definitions
      SET is_active = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
      [isActive, id]
    );

    return result.rows[0] || null;
  }

  async reorderOutcomeDefinitions(data: ReorderOutcomeDefinitionsDTO): Promise<OutcomeDefinition[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < data.orderedIds.length; i++) {
        await client.query(
          `
          UPDATE outcome_definitions
          SET sort_order = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
          [i + 1, data.orderedIds[i]]
        );
      }

      await client.query('COMMIT');

      const listResult = await this.pool.query<OutcomeDefinition>(
        `
        SELECT *
        FROM outcome_definitions
        ORDER BY sort_order ASC, name ASC
      `
      );

      return listResult.rows;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // no-op
      }
      logger.error('Failed to reorder outcome definitions', { error, orderedIds: data.orderedIds });
      throw Object.assign(new Error('Failed to reorder outcome definitions'), {
        statusCode: 500,
      });
    } finally {
      client.release();
    }
  }

  async getOutcomeDefinitionById(id: string): Promise<OutcomeDefinition | null> {
    const result = await this.pool.query<OutcomeDefinition>(
      `
      SELECT *
      FROM outcome_definitions
      WHERE id = $1
      LIMIT 1
    `,
      [id]
    );

    return result.rows[0] || null;
  }

  async upsertOutcomeDefinitionsByKey(
    definitions: CreateOutcomeDefinitionDTO[],
    client?: PoolClient
  ): Promise<void> {
    const executor = client ?? this.pool;

    for (const definition of definitions) {
      await executor.query(
        `
        INSERT INTO outcome_definitions (key, name, description, category, is_active, is_reportable, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          is_active = EXCLUDED.is_active,
          is_reportable = EXCLUDED.is_reportable,
          sort_order = EXCLUDED.sort_order,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          normalizeKey(definition.key),
          definition.name.trim(),
          definition.description ?? null,
          definition.category ?? null,
          definition.isActive ?? true,
          definition.isReportable ?? true,
          definition.sortOrder ?? 0,
        ]
      );
    }
  }
}

const outcomeDefinitionServiceInstance = new OutcomeDefinitionService(pool);

export const listOutcomeDefinitions = outcomeDefinitionServiceInstance.listOutcomeDefinitions.bind(
  outcomeDefinitionServiceInstance
);
export const createOutcomeDefinition = outcomeDefinitionServiceInstance.createOutcomeDefinition.bind(
  outcomeDefinitionServiceInstance
);
export const updateOutcomeDefinition = outcomeDefinitionServiceInstance.updateOutcomeDefinition.bind(
  outcomeDefinitionServiceInstance
);
export const setOutcomeDefinitionActive =
  outcomeDefinitionServiceInstance.setOutcomeDefinitionActive.bind(outcomeDefinitionServiceInstance);
export const reorderOutcomeDefinitions =
  outcomeDefinitionServiceInstance.reorderOutcomeDefinitions.bind(outcomeDefinitionServiceInstance);
export const getOutcomeDefinitionById = outcomeDefinitionServiceInstance.getOutcomeDefinitionById.bind(
  outcomeDefinitionServiceInstance
);
export const upsertOutcomeDefinitionsByKey =
  outcomeDefinitionServiceInstance.upsertOutcomeDefinitionsByKey.bind(outcomeDefinitionServiceInstance);

export default outcomeDefinitionServiceInstance;
