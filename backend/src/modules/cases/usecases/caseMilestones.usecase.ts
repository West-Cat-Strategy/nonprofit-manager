import type { CaseMilestonesPort } from '../types/ports';
import type { CreateCaseMilestoneDTO, UpdateCaseMilestoneDTO } from '@app-types/case';

export class CaseMilestonesUseCase {
  constructor(private readonly repository: CaseMilestonesPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseMilestones(caseId);
  }

  create(caseId: string, data: CreateCaseMilestoneDTO, userId?: string): Promise<unknown> {
    const payload: CreateCaseMilestoneDTO = {
      ...data,
      milestone_name: data.milestone_name.trim(),
      description: data.description?.trim() || undefined,
    };
    return this.repository.createCaseMilestone(caseId, payload, userId);
  }

  update(milestoneId: string, data: UpdateCaseMilestoneDTO): Promise<unknown> {
    const payload: UpdateCaseMilestoneDTO = {
      ...data,
      ...(data.milestone_name !== undefined ? { milestone_name: data.milestone_name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
    };
    return this.repository.updateCaseMilestone(milestoneId, payload);
  }

  delete(milestoneId: string): Promise<void> {
    return this.repository.deleteCaseMilestone(milestoneId);
  }
}
