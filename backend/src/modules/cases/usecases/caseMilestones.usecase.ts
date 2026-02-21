import type { CaseMilestonesPort } from '../types/ports';
import type { CreateCaseMilestoneDTO, UpdateCaseMilestoneDTO } from '@app-types/case';

export class CaseMilestonesUseCase {
  constructor(private readonly repository: CaseMilestonesPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseMilestones(caseId);
  }

  create(caseId: string, data: CreateCaseMilestoneDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseMilestone(caseId, data, userId);
  }

  update(milestoneId: string, data: UpdateCaseMilestoneDTO): Promise<unknown> {
    return this.repository.updateCaseMilestone(milestoneId, data);
  }

  delete(milestoneId: string): Promise<void> {
    return this.repository.deleteCaseMilestone(milestoneId);
  }
}
