import type { CasePriority } from '../../../types/case';

export type CasePriorityBadgeColor = 'gray' | 'blue' | 'yellow' | 'red';
export type ApiCasePriority = Exclude<CasePriority, 'critical'>;

export const CASE_PRIORITY_OPTIONS: ReadonlyArray<{ value: CasePriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
  critical: 'Critical',
};

const PRIORITY_BADGE_COLORS: Record<CasePriority, CasePriorityBadgeColor> = {
  low: 'gray',
  medium: 'blue',
  high: 'yellow',
  urgent: 'red',
  critical: 'red',
};

export const normalizeCasePriorityForApi = (
  priority?: CasePriority | null
): ApiCasePriority | null | undefined => {
  if (priority === undefined) return undefined;
  if (priority === null) return null;
  if (priority === 'critical') return 'urgent';
  return priority;
};

export const isUrgentEquivalentPriority = (priority?: CasePriority | null): boolean =>
  priority === 'urgent' || priority === 'critical';

export const getCasePriorityBadgeColor = (priority: CasePriority): CasePriorityBadgeColor =>
  PRIORITY_BADGE_COLORS[priority];

export const getCasePriorityLabel = (priority: CasePriority): string => PRIORITY_LABELS[priority];
