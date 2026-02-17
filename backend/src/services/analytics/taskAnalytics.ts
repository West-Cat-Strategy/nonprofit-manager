/**
 * Task Analytics Service
 * Handles task-related metrics
 */

import { Pool } from 'pg';
import { logger } from '@config/logger';
import type { TaskMetrics } from '@app-types/analytics';

export class TaskAnalyticsService {
  constructor(private pool: Pool) {}

  /**
   * Get task metrics for an account or contact
   */
  async getTaskMetrics(
    entityType: 'account' | 'contact',
    entityId: string
  ): Promise<TaskMetrics> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status IN ('not_started', 'in_progress', 'waiting')) as pending_tasks,
          COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'deferred') AND due_date < CURRENT_TIMESTAMP) as overdue_tasks,
          COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
          COUNT(*) FILTER (WHERE priority = 'normal') as priority_normal,
          COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
          COUNT(*) FILTER (WHERE priority = 'urgent') as priority_urgent,
          COUNT(*) FILTER (WHERE status = 'not_started') as status_not_started,
          COUNT(*) FILTER (WHERE status = 'in_progress') as status_in_progress,
          COUNT(*) FILTER (WHERE status = 'waiting') as status_waiting,
          COUNT(*) FILTER (WHERE status = 'completed') as status_completed,
          COUNT(*) FILTER (WHERE status = 'deferred') as status_deferred,
          COUNT(*) FILTER (WHERE status = 'cancelled') as status_cancelled
        FROM tasks
        WHERE related_to_type = $1 AND related_to_id = $2
      `;

      const result = await this.pool.query(query, [entityType, entityId]);
      const stats = result.rows[0];

      return {
        total_tasks: parseInt(stats.total_tasks),
        completed_tasks: parseInt(stats.completed_tasks),
        pending_tasks: parseInt(stats.pending_tasks),
        overdue_tasks: parseInt(stats.overdue_tasks),
        by_priority: {
          low: parseInt(stats.priority_low),
          normal: parseInt(stats.priority_normal),
          high: parseInt(stats.priority_high),
          urgent: parseInt(stats.priority_urgent),
        },
        by_status: {
          not_started: parseInt(stats.status_not_started),
          in_progress: parseInt(stats.status_in_progress),
          waiting: parseInt(stats.status_waiting),
          completed: parseInt(stats.status_completed),
          deferred: parseInt(stats.status_deferred),
          cancelled: parseInt(stats.status_cancelled),
        },
      };
    } catch (error) {
      logger.error('Error getting task metrics', { error, entityType, entityId });
      throw new Error('Failed to retrieve task metrics');
    }
  }
}
