import { useEffect, useRef, useState } from 'react';
import type { FollowUpEntityOption, FollowUpEntityType } from '../../../types/followup';
import { useFollowUpEntityLookup } from '../hooks/useFollowUpEntityLookup';

interface FollowUpEntityPickerProps {
  entityType: FollowUpEntityType;
  selectedOption: FollowUpEntityOption | null;
  onEntityTypeChange: (nextType: FollowUpEntityType) => void;
  onSelect: (option: FollowUpEntityOption | null) => void;
}

export default function FollowUpEntityPicker({
  entityType,
  selectedOption,
  onEntityTypeChange,
  onSelect,
}: FollowUpEntityPickerProps) {
  const { searchTerm, setSearchTerm, results, isLoading, clear } = useFollowUpEntityLookup(entityType);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
      return;
    }

    clear();
  }, [clear, selectedOption, setSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="grid gap-3 md:grid-cols-3" ref={containerRef}>
      <label className="flex flex-col text-sm font-bold">
        Entity Type
        <select
          id="follow-up-entity-type"
          aria-label="Follow-up entity type"
          value={entityType}
          onChange={(event) => {
            const nextType = event.target.value as FollowUpEntityType;
            onEntityTypeChange(nextType);
            onSelect(null);
            setIsOpen(false);
            clear();
          }}
          className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
        >
          <option value="case">Case</option>
          <option value="task">Task</option>
        </select>
      </label>

      <label className="relative md:col-span-2 flex flex-col text-sm font-bold">
        {entityType === 'case' ? 'Case' : 'Task'}
        <input
          id="follow-up-entity-search"
          aria-label={entityType === 'case' ? 'Search case' : 'Search task'}
          value={searchTerm}
          onChange={(event) => {
            const value = event.target.value;
            setSearchTerm(value);
            onSelect(null);
            setIsOpen(value.trim().length >= 2);
          }}
          onFocus={() => {
            if (searchTerm.trim().length >= 2 || results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={entityType === 'case' ? 'Search by case number/title' : 'Search by task subject'}
          className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
        />

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            {isLoading ? (
              <p className="px-3 py-2 text-xs text-[var(--app-text-muted)]">Searching...</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--app-text-muted)]">
                No {entityType === 'case' ? 'cases' : 'tasks'} found.
              </p>
            ) : (
              <ul>
                {results.map((option) => (
                  <li key={option.entityId}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(option);
                        setSearchTerm(option.label);
                        setIsOpen(false);
                      }}
                      className="w-full border-b border-[var(--app-border)] px-3 py-2 text-left hover:bg-[var(--app-surface-muted)]"
                    >
                      <div className="text-sm font-bold">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-[var(--app-text-muted)]">{option.description}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </label>
    </div>
  );
}
