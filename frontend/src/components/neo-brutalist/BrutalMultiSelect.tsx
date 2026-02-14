/**
 * Neo-brutalist Multi-Select Component
 * Select multiple values from a list
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
        <label className="block text-sm font-bold text-gray-900">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <div
        className={`border-2 bg-white cursor-pointer
          ${error ? 'border-red-600' : 'border-gray-900'}
          ${isOpen ? 'border-blue-600' : 'border-gray-900'}
          focus:outline-none focus:border-blue-600`}
      >
        <div className="p-2 flex flex-wrap gap-2">
          {selectedLabels.map((label) => (
            <span
              key={label}
              className="bg-gray-900 text-white px-2 py-1 text-xs font-bold flex items-center gap-1"
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
            className="flex-1 min-w-[100px] bg-transparent focus:outline-none font-mono text-sm"
          />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="border-2 border-gray-900 border-t-0 bg-white">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 font-mono text-sm border-b border-gray-200 last:border-b-0"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs font-bold text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
};
