import pool from '@config/database';
import { logger } from '@config/logger';
import type { CaseMilestonesPort } from '../types/ports';
import type { CreateCaseMilestoneDTO, UpdateCaseMilestoneDTO } from '@app-types/case';

export class CaseMilestonesRepository implements CaseMilestonesPort {
  async getCaseMilestones(caseId: string): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT * FROM case_milestones WHERE case_id = $1 ORDER BY sort_order, due_date`,
      [caseId]
    );
    return result.rows;
  }

  async createCaseMilestone(caseId: string, data: CreateCaseMilestoneDTO, userId?: string): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO case_milestones (case_id, milestone_name, description, due_date, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        caseId,
        data.milestone_name,
        data.description || null,
        data.due_date || null,
        data.sort_order ?? 0,
        userId || null,
      ]
    );
    logger.info('Milestone created', { caseId, milestoneId: result.rows[0].id });
    return result.rows[0];
  }

  async updateCaseMilestone(milestoneId: string, data: UpdateCaseMilestoneDTO): Promise<unknown> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.milestone_name !== undefined) {
      fields.push(`milestone_name = $${idx++}`);
      values.push(data.milestone_name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.due_date !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(data.due_date);
    }
    if (data.is_completed !== undefined) {
      fields.push(`is_completed = $${idx++}`);
      values.push(data.is_completed);
      if (data.is_completed) {
        fields.push(`completed_date = CURRENT_DATE`);
      } else {
        fields.push(`completed_date = NULL`);
      }
    }
    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(data.sort_order);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(milestoneId);
    const result = await pool.query(
      `UPDATE case_milestones
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      throw new Error('Milestone not found');
    }

    return result.rows[0];
  }

  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    await pool.query(`DELETE FROM case_milestones WHERE id = $1`, [milestoneId]);
    logger.info('Milestone deleted', { milestoneId });
  }
}
