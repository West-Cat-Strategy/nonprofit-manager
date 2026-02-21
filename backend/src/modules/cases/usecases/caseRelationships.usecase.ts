import type { CaseRelationshipsPort } from '../types/ports';
import type { CreateCaseRelationshipDTO } from '@app-types/case';

export class CaseRelationshipsUseCase {
  constructor(private readonly repository: CaseRelationshipsPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseRelationships(caseId);
  }

  create(caseId: string, data: CreateCaseRelationshipDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseRelationship(caseId, data, userId);
  }

  delete(relationshipId: string): Promise<void> {
    return this.repository.deleteCaseRelationship(relationshipId);
  }
}
