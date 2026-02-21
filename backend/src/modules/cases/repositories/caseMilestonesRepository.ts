import { services } from '@container/services';
import type { CaseMilestonesPort } from '../types/ports';
import type { CreateCaseMilestoneDTO, UpdateCaseMilestoneDTO } from '@app-types/case';

export class CaseMilestonesRepository implements CaseMilestonesPort {
  async getCaseMilestones(caseId: string): Promise<unknown[]> {
    return services.case.getCaseMilestones(caseId);
  }

  async createCaseMilestone(caseId: string, data: CreateCaseMilestoneDTO, userId?: string): Promise<unknown> {
    return services.case.createCaseMilestone(caseId, data, userId);
  }

  async updateCaseMilestone(milestoneId: string, data: UpdateCaseMilestoneDTO): Promise<unknown> {
    return services.case.updateCaseMilestone(milestoneId, data);
  }

  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    return services.case.deleteCaseMilestone(milestoneId);
  }
}
