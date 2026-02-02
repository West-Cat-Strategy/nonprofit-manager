/**
 * Task Types
 * Based on CDM Task model
 */

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  DEFERRED = 'deferred',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum RelatedToType {
  ACCOUNT = 'account',
  CONTACT = 'contact',
  EVENT = 'event',
  DONATION = 'donation',
  VOLUNTEER = 'volunteer',
}

export interface Task {
  id: string;
  subject: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  completed_date: Date | null;
  assigned_to: string | null;
  assigned_to_name?: string | null; // Joined from users table
  related_to_type: RelatedToType | null;
  related_to_id: string | null;
  related_to_name?: string | null; // Joined from related table
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateTaskDTO {
  subject: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string; // ISO string
  assigned_to?: string;
  related_to_type?: RelatedToType;
  related_to_id?: string;
}

export interface UpdateTaskDTO {
  subject?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null; // ISO string
  completed_date?: string | null; // ISO string
  assigned_to?: string | null;
  related_to_type?: RelatedToType | null;
  related_to_id?: string | null;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  related_to_type?: RelatedToType;
  related_to_id?: string;
  due_before?: string; // ISO string
  due_after?: string; // ISO string
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface TaskSummary {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
}
