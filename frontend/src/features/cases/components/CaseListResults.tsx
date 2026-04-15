import { memo } from 'react';
import { BrutalBadge, BrutalCard } from '../../../components/neo-brutalist';
import CaseProvenanceSummary from '../../../components/cases/CaseProvenanceSummary';
import type { CaseStatusType, CaseWithDetails } from '../../../types/case';
import { getCasePriorityBadgeColor } from '../utils/casePriority';
import { summarizeLabels } from '../utils/caseClassification';

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

const getTypeLabels = (caseItem: CaseWithDetails) =>
  summarizeLabels(
    caseItem.case_type_names?.length ? caseItem.case_type_names : [caseItem.case_type_name || 'General'],
    2
  );

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
              className="app-contrast-checkbox mt-1"
              aria-label={`Select case ${caseItem.case_number}`}
            />
            <div>
              <div className="flex items-center gap-2">
                {caseItem.is_urgent && (
                  <span className="text-app-text-heading" title="Urgent">⚠️</span>
                )}
                <span className="text-xs font-black uppercase text-app-text-subtle">{caseItem.case_number}</span>
              </div>
              <div className="text-lg font-black text-app-text-heading">{caseItem.title}</div>
              <div className="text-sm font-bold text-app-text-heading">{caseMeta.contactLabel}</div>
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
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-app-text-subtle">
          {getTypeLabels(caseItem).visible.map((label) => (
            <span
              key={label}
              className="inline-block border-2 border-app-border bg-app-surface-muted px-2 py-1 text-xs font-black uppercase text-app-text-heading"
            >
              {label}
            </span>
          ))}
          {getTypeLabels(caseItem).hiddenCount > 0 && (
            <span className="inline-block border-2 border-app-border bg-[var(--loop-green)] px-2 py-1 text-xs font-black uppercase text-app-brutal-ink">
              +{getTypeLabels(caseItem).hiddenCount}
            </span>
          )}
          {caseItem.provenance && (
            <CaseProvenanceSummary
              provenance={caseItem.provenance}
              variant="staff"
              density="inline"
            />
          )}
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
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-app-text-subtle">
            Tap card to open case
          </span>
          <details className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
            <summary className="cursor-pointer border-2 border-app-border bg-app-surface-elevated px-3 py-2 text-xs font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)]">
              Actions
            </summary>
            <div className="mt-2 grid min-w-32 gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigateCase(caseItem.id);
                }}
                className="border-2 border-app-border bg-[var(--loop-green)] px-3 py-2 text-xs font-black uppercase text-app-brutal-ink"
              >
                View
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onEditCase(caseItem.id);
                }}
                className="border-2 border-app-border bg-app-surface-elevated px-3 py-2 text-xs font-black uppercase text-app-text-heading"
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
      <td className="px-4 py-4 whitespace-nowrap text-app-text-heading">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(caseItem.id)}
          onClick={(event) => event.stopPropagation()}
          className="app-contrast-checkbox"
          aria-label={`Select case ${caseItem.case_number}`}
        />
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-app-text-heading">
        <div className="flex items-center gap-2">
          {caseItem.is_urgent && (
            <span className="text-app-text-heading" title="Urgent">⚠️</span>
          )}
          <span className="text-sm font-black text-app-text-heading">{caseItem.case_number}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-app-text-heading">
        <div className="text-sm font-black text-app-text-heading">{caseItem.title}</div>
        {caseItem.description && (
          <div className="max-w-xs truncate text-sm text-app-text-subtle">{caseItem.description}</div>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-app-text-heading">
        <div className="text-sm font-bold text-app-text-heading">{caseMeta.contactLabel}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-app-text-heading">
        <div className="flex flex-wrap gap-2">
          {getTypeLabels(caseItem).visible.map((label) => (
            <span
              key={label}
              className="inline-block border-2 border-app-border bg-app-surface-muted px-3 py-1 text-xs font-black uppercase text-app-text-heading"
            >
              {label}
            </span>
          ))}
          {getTypeLabels(caseItem).hiddenCount > 0 && (
            <span className="inline-block border-2 border-app-border bg-[var(--loop-green)] px-3 py-1 text-xs font-black uppercase text-app-brutal-ink">
              +{getTypeLabels(caseItem).hiddenCount}
            </span>
          )}
          {caseItem.provenance && (
            <CaseProvenanceSummary
              provenance={caseItem.provenance}
              variant="staff"
              density="inline"
            />
          )}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-app-text-heading">
        <BrutalBadge
          color={caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'}
          size="sm"
        >
          {caseItem.status_name}
        </BrutalBadge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-app-text-heading">
        <BrutalBadge color={getCasePriorityBadgeColor(caseItem.priority)} size="sm">
          {caseItem.priority}
        </BrutalBadge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-app-text-heading">
        {caseMeta.assignedLabel}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-app-text-heading">
        {caseItem.due_date ? (
          <span className={caseMeta.isOverdue ? 'font-black text-app-accent-text' : caseMeta.isDueSoon ? 'font-black text-app-accent-text' : 'text-app-text-heading'}>
            {caseMeta.dueDateLabel}
            {caseMeta.isOverdue && (
              <span className="block text-xs font-black uppercase text-app-accent-text">Overdue</span>
            )}
          </span>
        ) : (
          <span
            className="inline-flex items-center border-2 px-2 py-1 text-[11px] font-black uppercase"
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              borderColor: '#000000',
            }}
          >
            No due date
          </span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-app-text-subtle">
        {caseMeta.ageLabel}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-app-text-heading">
        <div className="flex gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEditCase(caseItem.id);
            }}
            className="border-2 border-app-border px-3 py-1 font-black uppercase text-app-brutal-ink shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)]"
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              borderColor: '#000000',
            }}
          >
            Edit
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNavigateCase(caseItem.id);
            }}
            className="border-2 border-app-border px-3 py-1 font-black uppercase text-app-brutal-ink shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)]"
            style={{
              backgroundColor: '#86efac',
              color: '#000000',
              borderColor: '#000000',
            }}
          >
            View
          </button>
        </div>
      </td>
    </tr>
  ),
);
