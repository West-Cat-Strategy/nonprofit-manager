import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAvailableFields } from '../store/slices/reportsSlice';
import type { ReportEntity } from '../types/report';

interface FieldSelectorProps {
  entity: ReportEntity;
  selectedFields: string[];
  onChange: (fields: string[]) => void;
}

function FieldSelector({ entity, selectedFields, onChange }: FieldSelectorProps) {
  const dispatch = useAppDispatch();
  const { availableFields, fieldsLoading } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchAvailableFields(entity));
  }, [dispatch, entity]);

  const currentFields = (availableFields[entity] || []) as { field: string; label: string; type: string }[];

  const handleToggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      onChange(selectedFields.filter((f) => f !== field));
    } else {
      onChange([...selectedFields, field]);
    }
  };

  const handleSelectAll = () => {
    onChange(currentFields.map((f) => f.field));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  if (currentFields.length === 0) {
    return (
      <div className="text-center py-8 text-app-text-muted">
        No fields available for this entity
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 text-sm bg-app-accent-soft text-app-accent rounded hover:bg-app-accent-soft-hover font-medium"
        >
          Select All
        </button>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-sm bg-app-surface-muted text-app-text-muted rounded hover:bg-app-surface-muted font-medium"
        >
          Clear All
        </button>
        <div className="ml-auto text-sm text-app-text-muted">
          {selectedFields.length} of {currentFields.length} fields selected
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentFields.map((field) => {
          const isSelected = selectedFields.includes(field.field);
          return (
            <label
              key={field.field}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-app-accent bg-app-accent-soft'
                  : 'border-app-border bg-app-surface hover:border-app-input-border'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleField(field.field)}
                className="w-4 h-4 text-app-accent border-app-input-border rounded focus:ring-app-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-app-text">
                  {field.label || field.field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
                <div className="text-xs text-app-text-muted">{field.type}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default FieldSelector;
