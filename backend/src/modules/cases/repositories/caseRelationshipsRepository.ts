import { services } from '@container/services';
import type { CaseRelationshipsPort } from '../types/ports';
import type { CreateCaseRelationshipDTO } from '@app-types/case';

export class CaseRelationshipsRepository implements CaseRelationshipsPort {
  async getCaseRelationships(caseId: string): Promise<unknown[]> {
    return services.case.getCaseRelationships(caseId);
  }

  async createCaseRelationship(caseId: string, data: CreateCaseRelationshipDTO, userId?: string): Promise<unknown> {
    return services.case.createCaseRelationship(caseId, data, userId);
  }

  async deleteCaseRelationship(relationshipId: string): Promise<void> {
    return services.case.deleteCaseRelationship(relationshipId);
  }
}
