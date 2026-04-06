import pool from '@config/database';
import type { CaseMilestonesPort } from '../types/ports';
import type { CreateCaseMilestoneDTO, UpdateCaseMilestoneDTO } from '@app-types/case';
import {
  createCaseMilestoneQuery,
  deleteCaseMilestoneQuery,
  getCaseMilestonesQuery,
  updateCaseMilestoneQuery,
} from '../queries/milestonesQueries';

export class CaseMilestonesRepository implements CaseMilestonesPort {
  async getCaseMilestones(caseId: string): Promise<unknown[]> {
    return getCaseMilestonesQuery(pool, caseId);
  }

  async createCaseMilestone(caseId: string, data: CreateCaseMilestoneDTO, userId?: string): Promise<unknown> {
    return createCaseMilestoneQuery(pool, caseId, data, userId);
  }

  async updateCaseMilestone(milestoneId: string, data: UpdateCaseMilestoneDTO): Promise<unknown> {
    return updateCaseMilestoneQuery(pool, milestoneId, data);
  }

  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    return deleteCaseMilestoneQuery(pool, milestoneId);
  }
}
