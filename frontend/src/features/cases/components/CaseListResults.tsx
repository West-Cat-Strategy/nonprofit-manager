import { memo } from 'react';
import { BrutalBadge, BrutalCard } from '../../../components/neo-brutalist';
import type { CaseStatusType, CaseWithDetails } from '../../../types/case';
import { getCasePriorityBadgeColor } from '../utils/casePriority';

const getStatusTypeBadgeColor = (
  statusType: CaseStatusType,
): 'purple' | 'green' | 'yellow' | 'gray' | 'red' => {
  const colors: Record<CaseStatusType, 'purple' | 'green' | 'yellow' | 'gray' | 'red'> = {
    intake: 'purple',
    active: 'green',
    review: 'yellow',
    closed: 'gray',
    cancelled: 'red',
  };
  return colors[statusType];
};

export interface CaseDisplayMeta {
  isOverdue: boolean;
  isDueSoon: boolean;
  ageLabel: string;
  dueDateLabel: string;
  assignedLabel: string;
  contactLabel: string;
}

interface MobileCaseCardProps {
  caseItem: CaseWithDetails;
  caseMeta: CaseDisplayMeta;
  isSelected: boolean;
  onToggleSelection: (caseId: string) => void;
  onNavigateCase: (caseId: string) => void;
  onEditCase: (caseId: string) => void;
}

export const MobileCaseCard = memo(
  ({
    caseItem,
    caseMeta,
    isSelected,
    onToggleSelection,
    onNavigateCase,
    onEditCase,
  }: MobileCaseCardProps) => (
    <div data-testid="mobile-case-card">
      <BrutalCard
        color="white"
        className={`p-4 cursor-pointer transition-colors ${caseMeta.isOverdue ? 'border-app-border bg-app-accent-soft' : 'hover:bg-[var(--loop-yellow)]'}`}
        onClick={() => onNavigateCase(caseItem.id)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(event) => {
                event.stopPropagation();
                onToggleSelection(caseItem.id);
              }}
              onClick={(event) => event.stopPropagation()}
              className="mt-1 h-5 w-5 border-2 border-black accent-black"
              aria-label={`Select case ${caseItem.case_number}`}
            />
            <div>
              <div className="flex items-center gap-2">
                {caseItem.is_urgent && (
                  <span className="text-black" title="Urgent">⚠️</span>
                )}
                <span className="text-xs font-black uppercase text-black/70">{caseItem.case_number}</span>
              </div>
              <div className="text-lg font-black text-black">{caseItem.title}</div>
              <div className="text-sm font-bold text-black">{caseMeta.contactLabel}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <BrutalBadge
              color={caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'}
              size="sm"
            >
              {caseItem.status_name}
            </BrutalBadge>
            <BrutalBadge color={getCasePriorityBadgeColor(caseItem.priority)} size="sm">
              {caseItem.priority}
            </BrutalBadge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-black/70">
          <span className="inline-block border-2 border-black bg-app-surface-muted px-2 py-1 text-xs font-black uppercase text-black">
            {caseItem.case_type_name || 'General'}
          </span>
          <span>Assigned: {caseMeta.assignedLabel}</span>
          <span>Age: {caseMeta.ageLabel}</span>
          {caseItem.due_date && (
            <span className={caseMeta.isOverdue ? 'text-app-accent font-black' : caseMeta.isDueSoon ? 'text-app-accent font-black' : ''}>
              Due: {caseMeta.dueDateLabel}
              {caseMeta.isOverdue && ' (OVERDUE)'}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-black/60">
            Tap card to open case
          </span>
          <details className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
            <summary className="cursor-pointer border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_var(--shadow-color)]">
              Actions
            </summary>
            <div className="mt-2 grid min-w-32 gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigateCase(caseItem.id);
                }}
                className="border-2 border-black bg-[var(--loop-green)] px-3 py-2 text-xs font-black uppercase text-black"
              >
                View
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onEditCase(caseItem.id);
                }}
                className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-black"
              >
                Edit
              </button>
            </div>
          </details>
        </div>
      </BrutalCard>
    </div>
  ),
);

interface DesktopCaseRowProps {
  caseItem: CaseWithDetails;
  caseMeta: CaseDisplayMeta;
  isSelected: boolean;
  onToggleSelection: (caseId: string) => void;
  onNavigateCase: (caseId: string) => void;
  onEditCase: (caseId: string) => void;
}

export const DesktopCaseRow = memo(
  ({
    caseItem,
    caseMeta,
    isSelected,
    onToggleSelection,
    onNavigateCase,
    onEditCase,
  }: DesktopCaseRowProps) => (
    <tr
      className={`border-b-2 border-black cursor-pointer transition-colors ${
        caseMeta.isOverdue
          ? 'bg-app-accent-soft hover:bg-app-accent-soft'
          : caseMeta.isDueSoon
          ? 'bg-app-accent-soft hover:bg-app-accent-soft'
          : 'hover:bg-[var(--loop-yellow)]'
      } ${isSelected ? 'ring-2 ring-inset ring-black' : ''}`}
      onClick={() => onNavigateCase(caseItem.id)}
    >
      <td className="px-4 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(caseItem.id)}
          onClick={(event) => event.stopPropagation()}
          className="w-5 h-5 border-2 border-black accent-black"
          aria-label={`Select case ${caseItem.case_number}`}
        />
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {caseItem.is_urgent && (
            <span className="text-black" title="Urgent">⚠️</span>
          )}
          <span className="text-sm font-black text-black">{caseItem.case_number}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-black text-black">{caseItem.title}</div>
        {caseItem.description && (
          <div className="text-sm text-black/70 truncate max-w-xs">{caseItem.description}</div>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-black">{caseMeta.contactLabel}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="inline-block border-2 border-black bg-app-surface-muted px-3 py-1 text-xs font-black uppercase text-black">
          {caseItem.case_type_name || 'General'}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <BrutalBadge
          color={caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'}
          size="sm"
        >
          {caseItem.status_name}
        </BrutalBadge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <BrutalBadge color={getCasePriorityBadgeColor(caseItem.priority)} size="sm">
          {caseItem.priority}
        </BrutalBadge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-black">
        {caseMeta.assignedLabel}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">
        {caseItem.due_date ? (
          <span className={caseMeta.isOverdue ? 'text-app-accent font-black' : caseMeta.isDueSoon ? 'text-app-accent font-black' : 'text-black'}>
            {caseMeta.dueDateLabel}
            {caseMeta.isOverdue && (
              <span className="block text-xs text-app-accent font-black uppercase">Overdue</span>
            )}
          </span>
        ) : (
          <span className="text-black/40">—</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-black/60">
        {caseMeta.ageLabel}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div className="flex gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEditCase(caseItem.id);
            }}
            className="border-2 border-black bg-white text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
          >
            Edit
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNavigateCase(caseItem.id);
            }}
            className="border-2 border-black bg-[var(--loop-green)] text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
          >
            View
          </button>
        </div>
      </td>
    </tr>
  ),
);
