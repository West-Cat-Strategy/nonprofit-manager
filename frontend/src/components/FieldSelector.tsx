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

  const currentFields = (availableFields[entity] || []) as { name: string; type: string }[];

  const handleToggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      onChange(selectedFields.filter((f) => f !== field));
    } else {
      onChange([...selectedFields, field]);
    }
  };

  const handleSelectAll = () => {
    onChange(currentFields.map((f) => f.name));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentFields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No fields available for this entity
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
        >
          Select All
        </button>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
        >
          Clear All
        </button>
        <div className="ml-auto text-sm text-gray-600">
          {selectedFields.length} of {currentFields.length} fields selected
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentFields.map((field) => {
          const isSelected = selectedFields.includes(field.name);
          return (
            <label
              key={field.name}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleField(field.name)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {field.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
                <div className="text-xs text-gray-500">{field.type}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default FieldSelector;
