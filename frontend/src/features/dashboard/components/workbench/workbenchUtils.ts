import { getRouteCatalogEntryById } from '../../../../routes/routeCatalog';
import type { CaseWithDetails } from '../../../../types/case';
import type { NavigationItem } from '../../../../hooks/useNavigationPreferences';
import type { FollowUpWithEntity } from '../../../followUps/types/contracts';
import type { WorkbenchLink } from './types';

const getWorkbenchSectionLabel = (routeId: string) => getRouteCatalogEntryById(routeId)?.section ?? 'Core';

export const buildWorkbenchLinks = (items: NavigationItem[]): WorkbenchLink[] =>
  items.map((item) => ({
    ...item,
    sectionLabel: getWorkbenchSectionLabel(item.id),
  }));

export const buildEnabledWorkbenchLinks = (items: NavigationItem[]): WorkbenchLink[] =>
  buildWorkbenchLinks(items.filter((item) => item.id !== 'dashboard' && !item.pinned));

export const countActiveWorkbenchSections = (items: NavigationItem[]): number =>
  new Set(items.filter((item) => item.id !== 'dashboard').map((item) => getWorkbenchSectionLabel(item.id))).size;

export const formatWorkbenchCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatWorkbenchNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

export const formatWorkbenchDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export function formatDueLabel(caseItem: CaseWithDetails) {
  if (!caseItem.due_date) return 'No due date';

  const dueDate = new Date(caseItem.due_date);
  const diffMs = dueDate.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return `Due ${formatWorkbenchDate(caseItem.due_date)}`;
}

export const getFollowUpEntityLabel = (followUp: FollowUpWithEntity) => {
  if (followUp.entity_type === 'case') {
    return followUp.case_number || followUp.case_title || 'Case follow-up';
  }

  return followUp.task_subject || 'Task follow-up';
};
