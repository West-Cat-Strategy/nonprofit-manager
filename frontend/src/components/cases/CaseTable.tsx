/**
 * Case Table Component
 * Desktop table view for case list
 */

import { useNavigate } from 'react-router-dom';
import { BrutalBadge, BrutalCard } from '../neo-brutalist';
import type { CaseWithDetails, CaseStatusType } from '../../types/case';
import { getCasePriorityBadgeColor } from '../../features/cases/utils/casePriority';

interface CaseTableProps {
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

export default function CaseTable({ cases }: CaseTableProps) {
  const navigate = useNavigate();

  return (
    <BrutalCard color="white" className="hidden md:block overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse" role="grid" aria-label="Cases table">
          <thead className="bg-[var(--loop-cyan)] border-b-2 border-black dark:border-white">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Case #
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Client
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Priority
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Assigned
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-app-surface dark:bg-app-text">
            {cases.map((caseItem) => (
              <tr
                key={caseItem.id}
                className="border-b-2 border-black dark:border-app-border hover:bg-[var(--loop-yellow)] dark:hover:bg-app-text cursor-pointer transition-colors"
                onClick={() => navigate(`/cases/${caseItem.id}`)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/cases/${caseItem.id}`);
                  }
                }}
                role="row"
                aria-label={`Case ${caseItem.case_number}: ${caseItem.title}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {caseItem.is_urgent && (
                      <span className="text-black" title="Urgent" aria-label="Urgent">
                        ⚠️
                      </span>
                    )}
                    <span className="text-sm font-black text-black dark:text-white">
                      {caseItem.case_number}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-black text-black dark:text-white">
                    {caseItem.title}
                  </div>
                  {caseItem.description && (
                    <div className="text-sm text-black/70 dark:text-white/70 truncate max-w-xs">
                      {caseItem.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-black dark:text-white">
                    {getContactLabel(caseItem)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className="inline-block border-2 border-black px-3 py-1 text-xs font-black uppercase"
                    style={{
                      backgroundColor: caseItem.case_type_color || '#e5e7eb',
                      color: '#000000',
                    }}
                  >
                    {caseItem.case_type_name || 'General'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <BrutalBadge
                    color={
                      caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'
                    }
                    size="sm"
                  >
                    {caseItem.status_name}
                  </BrutalBadge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <BrutalBadge color={getCasePriorityBadgeColor(caseItem.priority)} size="sm">
                    {caseItem.priority}
                  </BrutalBadge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black dark:text-white">
                  {getAssignedLabel(caseItem)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black dark:text-white">
                  {new Date(caseItem.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cases/${caseItem.id}/edit`);
                      }}
                      className="border-2 border-black dark:border-white bg-app-surface dark:bg-black text-black dark:text-white px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                      aria-label={`Edit case ${caseItem.case_number}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cases/${caseItem.id}`);
                      }}
                      className="border-2 border-black bg-[var(--loop-green)] text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                      aria-label={`View case ${caseItem.case_number}`}
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BrutalCard>
  );
}
