import { useAppSelector } from '../store/hooks';
import type { ReportEntity, ReportFilter, FilterOperator } from '../types/report';

interface FilterBuilderProps {
  entity: ReportEntity;
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

const OPERATORS: { value: FilterOperator; label: string; types: string[] }[] = [
  { value: 'eq', label: 'Equals', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'ne', label: 'Not Equals', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'gt', label: 'Greater Than', types: ['number', 'date'] },
  { value: 'gte', label: 'Greater Than or Equal', types: ['number', 'date'] },
  { value: 'lt', label: 'Less Than', types: ['number', 'date'] },
  { value: 'lte', label: 'Less Than or Equal', types: ['number', 'date'] },
  { value: 'like', label: 'Contains', types: ['string'] },
  { value: 'in', label: 'In List', types: ['string', 'number'] },
];

function FilterBuilder({ entity, filters, onChange }: FilterBuilderProps) {
  const { availableFields } = useAppSelector((state) => state.reports);
  const currentFields = (availableFields[entity] || []) as { field: string; label: string; type: string }[];

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      field: currentFields[0]?.field || '',
      operator: 'eq',
      value: '',
    };
    onChange([...filters, newFilter]);
  };

  const handleRemoveFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (index: number, updates: Partial<ReportFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onChange(newFilters);
  };

  const getFieldType = (fieldName: string): string => {
    const field = currentFields.find((f) => f.field === fieldName);
    return field?.type || 'string';
  };

  const getAvailableOperators = (fieldType: string) => {
    return OPERATORS.filter((op) => op.types.includes(fieldType));
  };

  const renderValueInput = (filter: ReportFilter, index: number) => {
    const fieldType = getFieldType(filter.field);

    if (filter.operator === 'in') {
      return (
        <input
          type="text"
          value={String(filter.value)}
          onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
          placeholder="value1,value2,value3"
          className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
        />
      );
    }

    if (fieldType === 'boolean') {
      return (
        <select
          value={String(filter.value)}
          onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
          className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
        >
          <option value="">Select...</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (fieldType === 'date') {
      return (
        <input
          type="date"
          value={String(filter.value)}
          onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
          className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
        />
      );
    }

    if (fieldType === 'number' || fieldType === 'currency') {
      return (
        <input
          type="number"
          value={String(filter.value)}
          onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
          placeholder="Enter value"
          step={fieldType === 'currency' ? '0.01' : '1'}
          className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
        />
      );
    }

    return (
      <input
        type="text"
        value={String(filter.value)}
        onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
        placeholder="Enter value"
        className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
      />
    );
  };

  if (currentFields.length === 0) {
    return (
      <div className="text-center py-4 text-app-text-muted">
        Select fields first to add filters
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {filters.map((filter, index) => {
          const fieldType = getFieldType(filter.field);
          const availableOperators = getAvailableOperators(fieldType);

          return (
            <div key={index} className="flex gap-3 items-start">
              {/* Field Selector */}
              <select
                value={filter.field}
                onChange={(e) => {
                  const newFieldType = getFieldType(e.target.value);
                  const availableOps = getAvailableOperators(newFieldType);
                  const newOperator = availableOps[0]?.value || 'eq';
                  handleUpdateFilter(index, {
                    field: e.target.value,
                    operator: newOperator,
                    value: '',
                  });
                }}
                className="w-48 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
              >
                {currentFields.map((field) => (
                  <option key={field.field} value={field.field}>
                    {field.label || field.field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>

              {/* Operator Selector */}
              <select
                value={filter.operator}
                onChange={(e) =>
                  handleUpdateFilter(index, { operator: e.target.value as FilterOperator })
                }
                className="w-48 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
              >
                {availableOperators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value Input */}
              {renderValueInput(filter, index)}

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveFilter(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove filter"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleAddFilter}
        className="mt-4 px-4 py-2 text-sm bg-app-surface-muted text-app-text-muted rounded-lg hover:bg-app-surface-muted font-medium"
      >
        + Add Filter
      </button>

      {filters.length > 0 && (
        <div className="mt-4 p-3 bg-app-accent-soft rounded-lg">
          <p className="text-sm text-app-accent-text">
            <strong>Tip:</strong> For "In List" operator, enter comma-separated values (e.g.,
            "value1,value2,value3")
          </p>
        </div>
      )}
    </div>
  );
}

export default FilterBuilder;
