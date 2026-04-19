import { Pool, PoolClient } from 'pg';
import { logger } from '@config/logger';
import type { CaseRelationship, CreateCaseRelationshipDTO } from '@app-types/case';

type PgExecutor = Pool | PoolClient;

import { requireCaseOwnership, requireCaseIdForRelationship } from './shared';

export const getCaseRelationshipsQuery = async (
  db: PgExecutor,
  caseId: string,
  organizationId?: string
): Promise<CaseRelationship[]> => {
  await requireCaseOwnership(db, caseId, organizationId);
  const result = await db.query(
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
};

export const createCaseRelationshipQuery = async (
  db: PgExecutor,
  caseId: string,
  data: CreateCaseRelationshipDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseRelationship> => {
  await requireCaseOwnership(db, caseId, organizationId);
  // Also check ownership of the related case
  await requireCaseOwnership(db, data.related_case_id, organizationId);
  const result = await db.query(
    `INSERT INTO case_relationships (case_id, related_case_id, relationship_type, description, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [caseId, data.related_case_id, data.relationship_type, data.description || null, userId || null]
  );
  logger.info('Case relationship created', { caseId, relatedCaseId: data.related_case_id });
  return result.rows[0];
};

export const deleteCaseRelationshipQuery = async (
  db: PgExecutor,
  relationshipId: string,
  organizationId?: string
): Promise<void> => {
  const caseId = await requireCaseIdForRelationship(db, relationshipId, organizationId);
  await requireCaseOwnership(db, caseId, organizationId);
  await db.query(`DELETE FROM case_relationships WHERE id = $1`, [relationshipId]);
  logger.info('Case relationship deleted', { relationshipId });
};
