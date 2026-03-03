import pool from '@config/database';
import { logger } from '@config/logger';
import type { CaseRelationshipsPort } from '../types/ports';
import type { CreateCaseRelationshipDTO } from '@app-types/case';

export class CaseRelationshipsRepository implements CaseRelationshipsPort {
  async getCaseRelationships(caseId: string): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT cr.*,
              c.case_number as related_case_number,
              c.title as related_case_title
       FROM case_relationships cr
       JOIN cases c ON cr.related_case_id = c.id
       WHERE cr.case_id = $1
       ORDER BY cr.created_at DESC`,
      [caseId]
    );
    return result.rows;
  }

  async createCaseRelationship(caseId: string, data: CreateCaseRelationshipDTO, userId?: string): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO case_relationships (case_id, related_case_id, relationship_type, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [caseId, data.related_case_id, data.relationship_type, data.description || null, userId || null]
    );
    logger.info('Case relationship created', { caseId, relatedCaseId: data.related_case_id });
    return result.rows[0];
  }

  async deleteCaseRelationship(relationshipId: string): Promise<void> {
    await pool.query(`DELETE FROM case_relationships WHERE id = $1`, [relationshipId]);
    logger.info('Case relationship deleted', { relationshipId });
  }
}
