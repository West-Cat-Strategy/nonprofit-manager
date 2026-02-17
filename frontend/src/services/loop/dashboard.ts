import type { DashboardStats } from '../../types/schema';
import api from '../api';

interface AnalyticsSummary {
  total_contacts: number;
  active_contacts: number;
  total_accounts: number;
  active_accounts: number;
  total_donations_ytd: number;
  donation_count_ytd: number;
  total_events_ytd: number;
  total_volunteers: number;
  total_volunteer_hours_ytd: number;
  engagement_distribution?: Record<string, number>;
}

interface TaskSummary {
  total: number;
  by_status: Record<string, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [analyticsRes, tasksRes] = await Promise.all([
    api.get<AnalyticsSummary>('/analytics/summary').catch(() => ({ data: null })),
    api.get<{ summary: TaskSummary }>('/tasks/summary').catch(() => ({ data: null })),
  ]);

  const analytics = analyticsRes.data as AnalyticsSummary | null;
  const tasksSummary = (tasksRes.data as { summary: TaskSummary } | null)?.summary;

  const pendingTasks = tasksSummary
    ? (tasksSummary.by_status?.not_started || 0) + (tasksSummary.by_status?.in_progress || 0)
    : 0;

  const totalPeople = analytics?.total_contacts || 0;
  const activePartners = analytics?.active_accounts || 0;
  const reach = analytics?.total_contacts || 0;

  // Ops efficiency: percentage of completed tasks
  const totalTasks = tasksSummary?.total || 1;
  const completedTasks = tasksSummary?.by_status?.completed || 0;
  const opsEfficiency = Math.round((completedTasks / totalTasks) * 100);

  // New people requests: contacts created recently (approximate from engagement distribution)
  const newPeopleRequests = analytics?.engagement_distribution?.low || 0;

  return {
    pendingTasks,
    newPeopleRequests,
    activePartners,
    opsEfficiency,
    reach,
    totalPeople,
  };
};
