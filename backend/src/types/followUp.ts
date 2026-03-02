export type FollowUpStatus = 'scheduled' | 'completed' | 'cancelled' | 'overdue';
export type FollowUpFrequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type FollowUpEntityType = 'case' | 'task';
export type FollowUpMethod = 'phone' | 'email' | 'in_person' | 'video_call' | 'other';

export interface FollowUp {
  id: string;
  organization_id: string;
  entity_type: FollowUpEntityType;
  entity_id: string;
  title: string;
  description?: string | null;
  scheduled_date: string;
  scheduled_time?: string | null;
  frequency: FollowUpFrequency;
  frequency_end_date?: string | null;
  method?: FollowUpMethod | null;
  status: FollowUpStatus;
  completed_date?: string | null;
  completed_notes?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  reminder_minutes_before?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpWithEntity extends FollowUp {
  case_number?: string;
  case_title?: string;
  case_priority?: string;
  contact_name?: string;
  task_subject?: string;
  task_priority?: string;
}

export interface CreateFollowUpDTO {
  entity_type: FollowUpEntityType;
  entity_id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  frequency?: FollowUpFrequency;
  frequency_end_date?: string;
  method?: FollowUpMethod;
  assigned_to?: string;
  reminder_minutes_before?: number;
}

export interface UpdateFollowUpDTO {
  title?: string;
  description?: string | null;
  scheduled_date?: string;
  scheduled_time?: string | null;
  frequency?: FollowUpFrequency;
  frequency_end_date?: string | null;
  method?: FollowUpMethod | null;
  status?: FollowUpStatus;
  assigned_to?: string | null;
  reminder_minutes_before?: number | null;
}

export interface CompleteFollowUpDTO {
  completed_notes?: string;
  schedule_next?: boolean;
  next_scheduled_date?: string;
}

export interface FollowUpFilters {
  entity_type?: FollowUpEntityType;
  entity_id?: string;
  status?: FollowUpStatus;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  overdue_only?: boolean;
  page?: number;
  limit?: number;
}

export interface FollowUpSummary {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
}
