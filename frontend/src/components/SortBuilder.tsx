import type { ReportEntity, ReportSort } from '../types/report';

interface SortBuilderProps {
  entity: ReportEntity;
  selectedFields: string[];
  sorts: ReportSort[];
  onChange: (sorts: ReportSort[]) => void;
}

function SortBuilder({ selectedFields, sorts, onChange }: SortBuilderProps) {
  const handleAddSort = () => {
    if (selectedFields.length === 0) return;

    const newSort: ReportSort = {
      field: selectedFields[0],
      direction: 'asc',
    };
    onChange([...sorts, newSort]);
  };

  const handleRemoveSort = (index: number) => {
    onChange(sorts.filter((_, i) => i !== index));
  };

  const handleUpdateSort = (index: number, updates: Partial<ReportSort>) => {
    const newSorts = [...sorts];
    newSorts[index] = { ...newSorts[index], ...updates };
    onChange(newSorts);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSorts = [...sorts];
    [newSorts[index - 1], newSorts[index]] = [newSorts[index], newSorts[index - 1]];
    onChange(newSorts);
  };

  const handleMoveDown = (index: number) => {
    if (index === sorts.length - 1) return;
    const newSorts = [...sorts];
    [newSorts[index], newSorts[index + 1]] = [newSorts[index + 1], newSorts[index]];
    onChange(newSorts);
  };

  if (selectedFields.length === 0) {
    return (
      <div className="text-center py-4 text-app-text-muted">
        Select fields first to add sorting
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {sorts.map((sort, index) => (
          <div key={index} className="flex gap-3 items-center">
            {/* Order Indicator */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-1 text-app-text-muted hover:text-app-text-muted disabled:text-app-text-subtle disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === sorts.length - 1}
                className="p-1 text-app-text-muted hover:text-app-text-muted disabled:text-app-text-subtle disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Priority Badge */}
            <div className="w-8 h-8 flex items-center justify-center bg-app-accent-soft text-app-accent rounded-full font-semibold text-sm">
              {index + 1}
            </div>

            {/* Field Selector */}
            <select
              value={sort.field}
              onChange={(e) => handleUpdateSort(index, { field: e.target.value })}
              className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
            >
              {selectedFields.map((field) => (
                <option key={field} value={field}>
                  {field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Direction Selector */}
            <select
              value={sort.direction}
              onChange={(e) =>
                handleUpdateSort(index, { direction: e.target.value as 'asc' | 'desc' })
              }
              className="w-48 px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
            >
              <option value="asc">Ascending (A-Z, 0-9)</option>
              <option value="desc">Descending (Z-A, 9-0)</option>
            </select>

            {/* Remove Button */}
            <button
              onClick={() => handleRemoveSort(index)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove sort"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddSort}
        disabled={selectedFields.length === 0}
        className="mt-4 px-4 py-2 text-sm bg-app-surface-muted text-app-text-muted rounded-lg hover:bg-app-surface-muted disabled:bg-app-hover disabled:cursor-not-allowed font-medium"
      >
        + Add Sort
      </button>

      {sorts.length > 0 && (
        <div className="mt-4 p-3 bg-app-accent-soft rounded-lg">
          <p className="text-sm text-app-accent-text">
            <strong>Sorting Order:</strong> Records will be sorted by the fields in the order
            shown above. Use the arrows to reorder.
          </p>
        </div>
      )}
    </div>
  );
}

export default SortBuilder;
