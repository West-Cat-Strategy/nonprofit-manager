/**
 * Task Service
 * Handles business logic for task management
 */

import { Pool } from 'pg';
import pool from '../config/database';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, TaskSummary, TaskStatus, TaskPriority } from '../types/task';

export class TaskService {
  constructor(private pool: Pool) {}

  /**
   * Get tasks with optional filtering and pagination
   */
  async getTasks(filters: TaskFilters): Promise<{ tasks: Task[]; pagination: { total: number; page: number; limit: number; pages: number }; summary: TaskSummary }> {
    const {
      search,
      status,
      priority,
      assigned_to,
      related_to_type,
      related_to_id,
      due_before,
      due_after,
      overdue,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(`(t.subject ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      conditions.push(`t.status = $${paramCount}`);
      values.push(status);
    }

    if (priority) {
      paramCount++;
      conditions.push(`t.priority = $${paramCount}`);
      values.push(priority);
    }

    if (assigned_to) {
      paramCount++;
      conditions.push(`t.assigned_to = $${paramCount}`);
      values.push(assigned_to);
    }

    if (related_to_type) {
      paramCount++;
      conditions.push(`t.related_to_type = $${paramCount}`);
      values.push(related_to_type);
    }

    if (related_to_id) {
      paramCount++;
      conditions.push(`t.related_to_id = $${paramCount}`);
      values.push(related_to_id);
    }

    if (due_before) {
      paramCount++;
      conditions.push(`t.due_date <= $${paramCount}`);
      values.push(due_before);
    }

    if (due_after) {
      paramCount++;
      conditions.push(`t.due_date >= $${paramCount}`);
      values.push(due_after);
    }

    if (overdue) {
      conditions.push(`t.due_date < CURRENT_TIMESTAMP AND t.status NOT IN ('completed', 'cancelled')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM tasks t ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get tasks with joined data
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT
        t.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        CASE
          WHEN t.related_to_type = 'account' THEN a.account_name
          WHEN t.related_to_type = 'contact' THEN c.first_name || ' ' || c.last_name
          WHEN t.related_to_type = 'event' THEN e.name
          WHEN t.related_to_type = 'donation' THEN d.donation_number
          WHEN t.related_to_type = 'volunteer' THEN vc.first_name || ' ' || vc.last_name
          ELSE NULL
        END as related_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN accounts a ON t.related_to_type = 'account' AND t.related_to_id = a.id
      LEFT JOIN contacts c ON t.related_to_type = 'contact' AND t.related_to_id = c.id
      LEFT JOIN events e ON t.related_to_type = 'event' AND t.related_to_id = e.id
      LEFT JOIN donations d ON t.related_to_type = 'donation' AND t.related_to_id = d.id
      LEFT JOIN contacts vc ON t.related_to_type = 'volunteer' AND t.related_to_id = vc.id
      ${whereClause}
      ORDER BY
        CASE WHEN t.status IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await this.pool.query(query, [...values, limit, offset]);
    const tasks = result.rows;

    // Get summary statistics
    const summaryQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'deferred') as deferred,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
        COUNT(*) FILTER (WHERE priority = 'normal') as priority_normal,
        COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
        COUNT(*) FILTER (WHERE priority = 'urgent') as priority_urgent,
        COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP AND status NOT IN ('completed', 'cancelled')) as overdue,
        COUNT(*) FILTER (WHERE DATE(due_date) = CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as due_today,
        COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days' AND status NOT IN ('completed', 'cancelled')) as due_this_week
      FROM tasks t
      ${whereClause}
    `;

    const summaryResult = await this.pool.query(summaryQuery, values);
    const summaryRow = summaryResult.rows[0];

    const summary: TaskSummary = {
      total: parseInt(summaryRow.total),
      by_status: {
        [TaskStatus.NOT_STARTED]: parseInt(summaryRow.not_started),
        [TaskStatus.IN_PROGRESS]: parseInt(summaryRow.in_progress),
        [TaskStatus.WAITING]: parseInt(summaryRow.waiting),
        [TaskStatus.COMPLETED]: parseInt(summaryRow.completed),
        [TaskStatus.DEFERRED]: parseInt(summaryRow.deferred),
        [TaskStatus.CANCELLED]: parseInt(summaryRow.cancelled),
      },
      by_priority: {
        [TaskPriority.LOW]: parseInt(summaryRow.priority_low),
        [TaskPriority.NORMAL]: parseInt(summaryRow.priority_normal),
        [TaskPriority.HIGH]: parseInt(summaryRow.priority_high),
        [TaskPriority.URGENT]: parseInt(summaryRow.priority_urgent),
      },
      overdue: parseInt(summaryRow.overdue),
      due_today: parseInt(summaryRow.due_today),
      due_this_week: parseInt(summaryRow.due_this_week),
    };

    return {
      tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(id: string): Promise<Task | null> {
    const query = `
      SELECT
        t.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        CASE
          WHEN t.related_to_type = 'account' THEN a.account_name
          WHEN t.related_to_type = 'contact' THEN c.first_name || ' ' || c.last_name
          WHEN t.related_to_type = 'event' THEN e.name
          WHEN t.related_to_type = 'donation' THEN d.donation_number
          WHEN t.related_to_type = 'volunteer' THEN vc.first_name || ' ' || vc.last_name
          ELSE NULL
        END as related_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN accounts a ON t.related_to_type = 'account' AND t.related_to_id = a.id
      LEFT JOIN contacts c ON t.related_to_type = 'contact' AND t.related_to_id = c.id
      LEFT JOIN events e ON t.related_to_type = 'event' AND t.related_to_id = e.id
      LEFT JOIN donations d ON t.related_to_type = 'donation' AND t.related_to_id = d.id
      LEFT JOIN contacts vc ON t.related_to_type = 'volunteer' AND t.related_to_id = vc.id
      WHERE t.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create a new task
   */
  async createTask(taskData: CreateTaskDTO, userId: string): Promise<Task> {
    const {
      subject,
      description,
      status = TaskStatus.NOT_STARTED,
      priority = TaskPriority.NORMAL,
      due_date,
      assigned_to,
      related_to_type,
      related_to_id,
    } = taskData;

    const query = `
      INSERT INTO tasks (
        subject, description, status, priority, due_date,
        assigned_to, related_to_type, related_to_id,
        created_by, modified_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      subject,
      description || null,
      status,
      priority,
      due_date || null,
      assigned_to || null,
      related_to_type || null,
      related_to_id || null,
      userId,
      userId,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: UpdateTaskDTO, userId: string): Promise<Task | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Handle status change to completed
    if (updates.status === TaskStatus.COMPLETED && !updates.completed_date) {
      updates.completed_date = new Date().toISOString();
    }

    // Handle status change from completed to other status
    if (updates.status && updates.status !== TaskStatus.COMPLETED) {
      updates.completed_date = null;
    }

    Object.entries(updates).forEach(([key, value]) => {
      paramCount++;
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
    });

    if (fields.length === 0) {
      return this.getTaskById(id);
    }

    paramCount++;
    fields.push(`modified_by = $${paramCount}`);
    values.push(userId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    paramCount++;
    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Complete a task
   */
  async completeTask(id: string, userId: string): Promise<Task | null> {
    return this.updateTask(
      id,
      {
        status: TaskStatus.COMPLETED,
        completed_date: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Get task summary statistics
   */
  async getTaskSummary(filters: TaskFilters = {}): Promise<TaskSummary> {
    const result = await this.getTasks({ ...filters, limit: 1 });
    return result.summary;
  }
}

// Backwards compatible export for existing code
export const taskService = new TaskService(pool);
