/**
 * Legacy multi-select export kept for route compatibility.
 */

import React, { useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BrutalMultiSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value: string[];
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const BrutalMultiSelect: React.FC<BrutalMultiSelectProps> = ({
  label,
  error,
  hint,
  required,
  value,
  onChange,
  options,
  placeholder = 'Select items...',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchInput.toLowerCase()) &&
      !value.includes(opt.value)
  );

  const handleSelect = (selectedValue: string) => {
    onChange([...value, selectedValue]);
  };

  const handleRemove = (removedValue: string) => {
    onChange(value.filter((v) => v !== removedValue));
  };

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-app-text-label">
          {label}
          {required && <span className="text-app-accent ml-1">*</span>}
        </label>
      )}
      <div
        className={`cursor-pointer rounded-[var(--ui-radius-sm)] border bg-app-input-bg shadow-sm
          ${error ? 'border-app-accent' : 'border-app-input-border'}
          ${isOpen ? 'border-app-accent' : 'border-app-input-border'}
          focus:outline-none focus:ring-2 focus:ring-app-accent`}
      >
        <div className="p-2 flex flex-wrap gap-2">
          {selectedLabels.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 rounded-[var(--ui-radius-xs)] border border-app-border-muted bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text"
            >
              {label}
              <button
                onClick={() =>
                  handleRemove(
                    options.find((opt) => opt.label === label)?.value || ''
                  )
                }
                className="hover:opacity-75"
                type="button"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder={selectedLabels.length === 0 ? placeholder : ''}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="flex-1 min-w-[100px] bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface shadow-sm">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full border-b border-app-border-muted px-3 py-2 text-left text-sm hover:bg-app-surface-muted last:border-b-0"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-app-text-muted">{hint}</p>
      )}
    </div>
  );
};
