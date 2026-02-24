/**
 * Case Filters Component
 * Reusable filter controls for case list
 */

import { BrutalButton, BrutalCard, BrutalInput } from '../neo-brutalist';
import type { CaseFilter, CasePriority, CaseStatus, CaseType } from '../../types/case';
import { CASE_PRIORITY_OPTIONS } from '../../features/cases/utils/casePriority';

type QuickFilter = 'all' | 'overdue' | 'due_soon' | 'unassigned' | 'urgent';

interface SavedView {
  id: string;
  name: string;
  filters: CaseFilter;
  quickFilter: QuickFilter;
}

interface CaseFiltersProps {
  // Filter values
  searchTerm: string;
  selectedPriority: CasePriority | '';
  selectedStatus: string;
  selectedType: string;
  showUrgentOnly: boolean;
  selectedSort: string;
  selectedOrder: 'asc' | 'desc';
  quickFilter: QuickFilter;
  dueSoonDays: number;

  // Options
  caseTypes: CaseType[];
  caseStatuses: CaseStatus[];

  // Saved views
  savedViews: SavedView[];
  selectedViewId: string;
  savedViewName: string;

  // Callbacks
  onSearchTermChange: (value: string) => void;
  onPriorityChange: (value: CasePriority | '') => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onUrgentOnlyChange: (value: boolean) => void;
  onSortChange: (value: string) => void;
  onOrderChange: (value: 'asc' | 'desc') => void;
  onQuickFilterChange: (value: QuickFilter) => void;
  onDueSoonDaysChange: (value: number) => void;
  onSavedViewNameChange: (value: string) => void;
  onApplyView: (viewId: string) => void;
  onSaveView: () => void;
  onDeleteView: () => void;
  onCopyLink: () => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;

  // State
  hasActiveFilters: boolean;
  activeFiltersCount: number;
}

const QUICK_FILTER_OPTIONS: Array<[QuickFilter, string]> = [
  ['all', 'All'],
  ['overdue', 'Overdue'],
  ['due_soon', 'Due soon'],
  ['unassigned', 'Unassigned'],
  ['urgent', 'Urgent'],
];

export default function CaseFilters({
  searchTerm,
  selectedPriority,
  selectedStatus,
  selectedType,
  showUrgentOnly,
  selectedSort,
  selectedOrder,
  quickFilter,
  dueSoonDays,
  caseTypes,
  caseStatuses,
  savedViews,
  selectedViewId,
  savedViewName,
  onSearchTermChange,
  onPriorityChange,
  onStatusChange,
  onTypeChange,
  onUrgentOnlyChange,
  onSortChange,
  onOrderChange,
  onQuickFilterChange,
  onDueSoonDaysChange,
  onSavedViewNameChange,
  onApplyView,
  onSaveView,
  onDeleteView,
  onCopyLink,
  onClearFilters,
  onApplyFilters,
  hasActiveFilters,
  activeFiltersCount,
}: CaseFiltersProps) {
  const selectClassName =
    'w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all';

  return (
    <BrutalCard color="white" className="p-4">
      {/* Main Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <BrutalInput
            type="text"
            placeholder="Search by case number, title, or description..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onApplyFilters()}
            aria-label="Search cases"
          />
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className={selectClassName}
            aria-label="Filter by case type"
          >
            <option value="">All Types</option>
            {caseTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className={selectClassName}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {caseStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value as CasePriority | '')}
            className={selectClassName}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            {CASE_PRIORITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort and Saved Views Row */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase text-black/70 dark:text-white/70">
            Sort by
          </span>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className={selectClassName}
            aria-label="Sort by field"
          >
            <option value="created_at">Created date</option>
            <option value="due_date">Due date</option>
            <option value="priority">Priority</option>
            <option value="case_number">Case number</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase text-black/70 dark:text-white/70">
            Order
          </span>
          <select
            value={selectedOrder}
            onChange={(e) => onOrderChange(e.target.value as 'asc' | 'desc')}
            className={selectClassName}
            aria-label="Sort order"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase text-black/70 dark:text-white/70">
            Saved views
          </span>
          <div className="flex gap-2">
            <select
              value={selectedViewId}
              onChange={(e) => onApplyView(e.target.value)}
              className={`flex-1 ${selectClassName}`}
              aria-label="Select saved view"
            >
              <option value="">Select view</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <button
              onClick={onDeleteView}
              disabled={!selectedViewId}
              className="border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all disabled:opacity-50"
              aria-label="Delete saved view"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase text-black/70 dark:text-white/70">
          Quick filters
        </span>
        {QUICK_FILTER_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => onQuickFilterChange(value)}
            className={`border-2 border-black dark:border-white px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-all ${
              quickFilter === value
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black text-black dark:text-white hover:bg-[var(--loop-yellow)]'
            }`}
            aria-pressed={quickFilter === value}
          >
            {label}
          </button>
        ))}
        {quickFilter === 'due_soon' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-black/70 dark:text-white/70">
              Days
            </span>
            <input
              type="number"
              min={1}
              max={60}
              value={dueSoonDays}
              onChange={(e) => {
                const value = Number(e.target.value);
                const nextValue = Number.isNaN(value) ? 7 : Math.max(1, Math.min(60, value));
                onDueSoonDaysChange(nextValue);
              }}
              className="w-20 border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white px-2 py-1 text-xs font-black uppercase focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              aria-label="Due within days"
            />
          </div>
        )}
      </div>

      {/* Actions Row */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showUrgentOnly}
            onChange={(e) => onUrgentOnlyChange(e.target.checked)}
            className="w-5 h-5 border-2 border-black dark:border-white accent-black dark:accent-white"
          />
          <span className="text-sm font-bold text-black dark:text-white uppercase">
            Urgent only
          </span>
        </label>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <BrutalInput
            type="text"
            placeholder="Save current view"
            value={savedViewName}
            onChange={(e) => onSavedViewNameChange(e.target.value)}
            aria-label="View name to save"
          />
          <BrutalButton onClick={onSaveView} variant="secondary" size="sm">
            Save View
          </BrutalButton>
        </div>

        <BrutalButton onClick={onCopyLink} variant="secondary" size="sm">
          Copy Link
        </BrutalButton>

        {hasActiveFilters && (
          <span className="text-xs font-black uppercase text-black/70 dark:text-white/70">
            {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} applied
          </span>
        )}

        <BrutalButton onClick={onClearFilters} variant="secondary" size="sm">
          Clear Filters
        </BrutalButton>

        <BrutalButton onClick={onApplyFilters} variant="primary" size="sm">
          Apply Filters
        </BrutalButton>
      </div>
    </BrutalCard>
  );
}
