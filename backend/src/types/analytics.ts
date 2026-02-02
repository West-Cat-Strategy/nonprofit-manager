/**
 * Analytics Types
 * Type definitions for constituent analytics and metrics
 */

export interface DonationMetrics {
  total_amount: number;
  total_count: number;
  average_amount: number;
  first_donation_date: string | null;
  last_donation_date: string | null;
  recurring_donations: number;
  recurring_amount: number;
  largest_donation: number;
  by_payment_method: Record<string, { count: number; amount: number }>;
  by_year: Record<string, { count: number; amount: number }>;
}

export interface EventMetrics {
  total_registrations: number;
  events_attended: number;
  no_shows: number;
  attendance_rate: number;
  by_event_type: Record<string, number>;
  recent_events: Array<{
    event_id: string;
    event_name: string;
    event_date: string;
    status: string;
  }>;
}

export interface VolunteerMetrics {
  total_hours: number;
  total_assignments: number;
  completed_assignments: number;
  active_assignments: number;
  skills: string[];
  availability_status: string;
  volunteer_since: string | null;
  hours_by_month: Record<string, number>;
  recent_assignments: Array<{
    assignment_id: string;
    event_name?: string;
    task_subject?: string;
    hours_logged: number;
    status: string;
  }>;
}

export interface TaskMetrics {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
}

export interface AccountAnalytics {
  account_id: string;
  account_name: string;
  account_type: string;
  category: string;
  created_at: string;
  contact_count: number;
  primary_contact?: {
    contact_id: string;
    name: string;
    email: string | null;
  };
  donation_metrics: DonationMetrics;
  event_metrics: EventMetrics;
  task_metrics: TaskMetrics;
  engagement_score: number;
  engagement_level: 'high' | 'medium' | 'low' | 'inactive';
}

export interface ContactAnalytics {
  contact_id: string;
  contact_name: string;
  email: string | null;
  account_id: string | null;
  account_name: string | null;
  contact_role: string;
  created_at: string;
  donation_metrics: DonationMetrics;
  event_metrics: EventMetrics;
  volunteer_metrics: VolunteerMetrics | null;
  task_metrics: TaskMetrics;
  engagement_score: number;
  engagement_level: 'high' | 'medium' | 'low' | 'inactive';
}

export interface AnalyticsSummary {
  total_accounts: number;
  active_accounts: number;
  total_contacts: number;
  active_contacts: number;
  total_donations_ytd: number;
  donation_count_ytd: number;
  average_donation_ytd: number;
  total_events_ytd: number;
  total_volunteers: number;
  total_volunteer_hours_ytd: number;
  engagement_distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  account_type?: string;
  category?: string;
}

export interface EventTrendPoint {
  month: string;
  total_events: number;
  total_registrations: number;
  total_attendance: number;
  capacity_utilization: number;
  attendance_rate: number;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  change_percent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ComparativeAnalytics {
  period_type: 'month' | 'quarter' | 'year';
  current_period: string;
  previous_period: string;
  metrics: {
    total_donations: PeriodComparison;
    donation_count: PeriodComparison;
    average_donation: PeriodComparison;
    new_contacts: PeriodComparison;
    total_events: PeriodComparison;
    volunteer_hours: PeriodComparison;
    engagement_score: PeriodComparison;
  };
}

export default {
  DonationMetrics: {} as DonationMetrics,
  EventMetrics: {} as EventMetrics,
  VolunteerMetrics: {} as VolunteerMetrics,
  TaskMetrics: {} as TaskMetrics,
  AccountAnalytics: {} as AccountAnalytics,
  ContactAnalytics: {} as ContactAnalytics,
  AnalyticsSummary: {} as AnalyticsSummary,
  AnalyticsFilters: {} as AnalyticsFilters,
  PeriodComparison: {} as PeriodComparison,
  ComparativeAnalytics: {} as ComparativeAnalytics,
};
