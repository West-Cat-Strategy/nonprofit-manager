/**
 * Case Cards Component
 * Mobile card view for case list
 */

import { useNavigate } from 'react-router-dom';
import { BrutalBadge, BrutalCard } from '../neo-brutalist';
import type { CaseWithDetails, CaseStatusType } from '../../types/case';
import { getCasePriorityBadgeColor } from '../../features/cases/utils/casePriority';

interface CaseCardsProps {
  cases: CaseWithDetails[];
}

const getStatusTypeBadgeColor = (
  statusType: CaseStatusType
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

const getAssignedLabel = (caseItem: CaseWithDetails): string => {
  if (caseItem.assigned_first_name || caseItem.assigned_last_name) {
    return `${caseItem.assigned_first_name || ''} ${caseItem.assigned_last_name || ''}`.trim();
  }
  return caseItem.assigned_to ? 'Assigned' : 'Unassigned';
};

const getContactLabel = (caseItem: CaseWithDetails): string => {
  const name = `${caseItem.contact_first_name || ''} ${caseItem.contact_last_name || ''}`.trim();
  return name || 'Unknown contact';
};

export default function CaseCards({ cases }: CaseCardsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 md:hidden" role="list" aria-label="Cases list">
      {cases.map((caseItem) => (
        <div
          key={caseItem.id}
          role="listitem"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/cases/${caseItem.id}`);
            }
          }}
          aria-label={`Case ${caseItem.case_number}: ${caseItem.title}`}
        >
        <BrutalCard
          color="white"
          className="p-4 cursor-pointer hover:bg-[var(--loop-yellow)] transition-colors"
          onClick={() => navigate(`/cases/${caseItem.id}`)}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {caseItem.is_urgent && (
                  <span className="text-black" title="Urgent" aria-label="Urgent">
                    ⚠️
                  </span>
                )}
                <span className="text-xs font-black uppercase text-black/70 dark:text-black/70">
                  {caseItem.case_number}
                </span>
              </div>
              <div className="text-lg font-black text-black">{caseItem.title}</div>
              <div className="text-sm font-bold text-black">{getContactLabel(caseItem)}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <BrutalBadge
                color={
                  caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'
                }
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
            <span
              className="inline-block border-2 border-black px-2 py-1 text-xs font-black uppercase"
              style={{
                backgroundColor: caseItem.case_type_color || '#e5e7eb',
                color: '#000000',
              }}
            >
              {caseItem.case_type_name || 'General'}
            </span>
            <span>Assigned: {getAssignedLabel(caseItem)}</span>
            <span>{new Date(caseItem.created_at).toLocaleDateString()}</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/cases/${caseItem.id}/edit`);
              }}
              className="flex-1 border-2 border-black bg-white text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
              aria-label={`Edit case ${caseItem.case_number}`}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/cases/${caseItem.id}`);
              }}
              className="flex-1 border-2 border-black bg-[var(--loop-green)] text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
              aria-label={`View case ${caseItem.case_number}`}
            >
              View
            </button>
          </div>
        </BrutalCard>
        </div>
      ))}
    </div>
  );
}
