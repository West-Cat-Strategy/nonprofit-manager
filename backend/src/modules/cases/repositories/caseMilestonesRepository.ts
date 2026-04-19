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
  async getCaseMilestones(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseMilestonesQuery(pool, caseId, organizationId);
  }

  async createCaseMilestone(
    caseId: string,
    data: CreateCaseMilestoneDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return createCaseMilestoneQuery(pool, caseId, data, userId, organizationId);
  }

  async updateCaseMilestone(
    milestoneId: string,
    data: UpdateCaseMilestoneDTO,
    organizationId?: string
  ): Promise<unknown> {
    return updateCaseMilestoneQuery(pool, milestoneId, data, organizationId);
  }

  async deleteCaseMilestone(milestoneId: string, organizationId?: string): Promise<void> {
    return deleteCaseMilestoneQuery(pool, milestoneId, organizationId);
  }
}
