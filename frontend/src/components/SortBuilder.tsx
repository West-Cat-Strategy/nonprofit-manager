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
    <div className="space-y-4">
      <div className="space-y-4">
        {sorts.map((sort, index) => (
          <div key={index} className="flex gap-4 items-center bg-[var(--app-surface-muted)] p-4 border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)]">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                data-testid={`move-up-${index}`}
                className="p-1 text-black hover:bg-[var(--loop-yellow)] disabled:opacity-30 border-2 border-transparent hover:border-black transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === sorts.length - 1}
                data-testid={`move-down-${index}`}
                className="p-1 text-black hover:bg-[var(--loop-yellow)] disabled:opacity-30 border-2 border-transparent hover:border-black transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="w-10 h-10 flex items-center justify-center bg-black text-white font-black text-lg">
              {index + 1}
            </div>

            <select
              value={sort.field}
              onChange={(e) => handleUpdateSort(index, { field: e.target.value })}
              className="flex-1 px-4 py-3 bg-white border-2 border-black font-bold uppercase focus:ring-0"
            >
              {selectedFields.map((field) => (
                <option key={field} value={field}>
                  {field.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={sort.direction}
              onChange={(e) =>
                handleUpdateSort(index, { direction: e.target.value as 'asc' | 'desc' })
              }
              className="w-48 px-4 py-3 bg-white border-2 border-black font-bold uppercase focus:ring-0"
            >
              <option value="asc">ASC (A-Z)</option>
              <option value="desc">DESC (Z-A)</option>
            </select>

            <button
              onClick={() => handleRemoveSort(index)}
              data-testid={`remove-sort-${index}`}
              className="px-4 py-3 bg-[var(--loop-red)] text-white border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddSort}
        disabled={selectedFields.length === 0}
        className="px-6 py-3 bg-[var(--loop-blue)] text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] font-black uppercase hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
      >
        + Add Sorting Rule
      </button>
    </div>
  );
}

export default SortBuilder;
