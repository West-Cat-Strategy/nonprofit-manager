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
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={handleSelectAll}
          className="px-6 py-3 bg-[var(--loop-blue)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
        >
          Select All
        </button>
        <button
          onClick={handleClearAll}
          className="px-6 py-3 bg-[var(--app-surface-muted)] text-[var(--app-text)] border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
        >
          Clear All
        </button>
        <div className="ml-auto text-sm font-bold text-[var(--app-text)] uppercase self-center bg-[var(--loop-yellow)] px-3 py-1 border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)]">
          {selectedFields.length} of {currentFields.length} fields selected
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentFields.map((field) => {
          const isSelected = selectedFields.includes(field.field);
          return (
            <label
              key={field.field}
              className={`flex items-center gap-3 p-4 border-2 cursor-pointer transition-all shadow-[2px_2px_0px_0px_var(--shadow-color)] ${isSelected
                  ? 'border-[var(--app-border)] bg-[var(--loop-yellow)] text-black'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
                }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleField(field.field)}
                className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-black checked:border-black focus:ring-0 transition-all cursor-pointer relative after:content-[''] after:absolute after:hidden after:left-[5px] after:top-[1px] after:w-[6px] after:h-[10px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45 checked:after:block"
              />
              <div className="flex-1">
                <div className="font-bold uppercase tracking-tight">
                  {field.label || field.field.replace(/_/g, ' ')}
                </div>
                <div className="text-xs font-bold uppercase opacity-60">{field.type}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default FieldSelector;
