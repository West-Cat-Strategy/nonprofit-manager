/**
 * Task Types (Frontend)
 * Based on CDM Task model
 */

export const TaskStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  DEFERRED: 'deferred',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const RelatedToType = {
  ACCOUNT: 'account',
  CONTACT: 'contact',
  EVENT: 'event',
  DONATION: 'donation',
  VOLUNTEER: 'volunteer',
} as const;

export type RelatedToType = (typeof RelatedToType)[keyof typeof RelatedToType];

export interface Task {
  id: string;
  subject: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_date: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  related_to_type: RelatedToType | null;
  related_to_id: string | null;
  related_to_name?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateTaskDTO {
  subject: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  assigned_to?: string;
  related_to_type?: RelatedToType;
  related_to_id?: string;
}

export interface UpdateTaskDTO {
  subject?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  completed_date?: string | null;
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
  due_before?: string;
  due_after?: string;
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
