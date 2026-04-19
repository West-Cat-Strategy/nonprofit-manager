import pool from '@config/database';
import type { CaseRelationshipsPort } from '../types/ports';
import type { CreateCaseRelationshipDTO } from '@app-types/case';
import {
  createCaseRelationshipQuery,
  deleteCaseRelationshipQuery,
  getCaseRelationshipsQuery,
} from '../queries/relationshipsQueries';

export class CaseRelationshipsRepository implements CaseRelationshipsPort {
  async getCaseRelationships(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseRelationshipsQuery(pool, caseId, organizationId);
  }

  async createCaseRelationship(
    caseId: string,
    data: CreateCaseRelationshipDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return createCaseRelationshipQuery(pool, caseId, data, userId, organizationId);
  }

  async deleteCaseRelationship(relationshipId: string, organizationId?: string): Promise<void> {
    return deleteCaseRelationshipQuery(pool, relationshipId, organizationId);
  }
}
