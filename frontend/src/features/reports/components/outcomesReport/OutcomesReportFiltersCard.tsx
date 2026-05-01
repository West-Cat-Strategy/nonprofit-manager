import { FormField, SectionCard, SelectField } from '../../../../components/ui';
import type { OutcomesReportFilters } from '../../../../types/outcomes';
import type { OutcomesReportFilterChange } from '../../hooks/useOutcomesReportController';
import { interactionTypeOptions } from '../../utils/outcomesReport';

interface OutcomesReportFiltersCardProps {
  filters: OutcomesReportFilters;
  onFilterChange: OutcomesReportFilterChange;
}

export default function OutcomesReportFiltersCard({
  filters,
  onFilterChange,
}: OutcomesReportFiltersCardProps) {
  return (
    <SectionCard
      title="Filters"
      subtitle="Choose the date range, source, and staff view for this outcomes report."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-7">
        <FormField
          type="date"
          label="From"
          value={filters.from}
          onChange={(event) => onFilterChange('from', event.target.value)}
        />
        <FormField
          type="date"
          label="To"
          value={filters.to}
          onChange={(event) => onFilterChange('to', event.target.value)}
        />
        <SelectField
          label="Bucket"
          value={filters.bucket || 'month'}
          onChange={(event) =>
            onFilterChange('bucket', event.target.value as OutcomesReportFilters['bucket'])
          }
        >
          <option value="week">Week</option>
          <option value="month">Month</option>
        </SelectField>
        <SelectField
          label="Source"
          value={filters.source || 'all'}
          onChange={(event) =>
            onFilterChange('source', event.target.value as OutcomesReportFilters['source'])
          }
        >
          <option value="all">All</option>
          <option value="interaction">Interaction tags</option>
          <option value="event">Case outcome events</option>
        </SelectField>
        <FormField
          type="text"
          label="Staff member"
          value={filters.staffId || ''}
          onChange={(event) => onFilterChange('staffId', event.target.value || undefined)}
          placeholder="Optional"
        />
        <SelectField
          label="Interaction Type"
          value={filters.interactionType || ''}
          onChange={(event) =>
            onFilterChange(
              'interactionType',
              (event.target.value || undefined) as OutcomesReportFilters['interactionType']
            )
          }
        >
          <option value="">All</option>
          {interactionTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <label className="mt-6 inline-flex items-center gap-2 text-sm text-app-text-muted">
          <input
            type="checkbox"
            checked={Boolean(filters.includeNonReportable)}
            onChange={(event) =>
              onFilterChange('includeNonReportable', event.target.checked || undefined)
            }
          />
          Include private notes
        </label>
      </div>
    </SectionCard>
  );
}
