/**
 * Advanced Filter Panel
 * Reusable filter component for list pages
 */

import React from 'react';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { BrutalButton, BrutalCard } from '../neo-brutalist';

interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'date' | 'multi-select';
  options?: Array<{ value: string; label: string }>;
  value?: string | string[];
  placeholder?: string;
}

interface FilterPanelProps {
  fields: FilterField[];
  onFilterChange: (filterId: string, value: string | string[]) => void;
  onApply?: () => void;
  onClear?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeFilterCount?: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  fields,
  onFilterChange,
  onApply,
  onClear,
  isCollapsed = false,
  onToggleCollapse,
  activeFilterCount = 0,
}) => {
  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 font-bold text-app-text hover:text-app-accent"
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-app-accent text-white px-2 py-1 text-xs rounded">
              {activeFilterCount}
            </span>
          )}
        </button>
        {!isCollapsed && onClear && (
          <button
            onClick={onClear}
            className="text-sm text-app-text-muted hover:text-app-text font-mono"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Fields */}
      {!isCollapsed && (
        <BrutalCard className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-bold text-app-text">
                  {field.label}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={(field.value as string) || ''}
                    onChange={(e) =>
                      onFilterChange(field.id, e.target.value)
                    }
                    className="w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text
                      font-mono placeholder-app-text-subtle focus:outline-none focus:border-app-accent"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={(field.value as string) || ''}
                    onChange={(e) =>
                      onFilterChange(field.id, e.target.value)
                    }
                    className="w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text
                      font-mono focus:outline-none focus:border-app-accent cursor-pointer"
                  >
                    <option value="">All</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={(field.value as string) || ''}
                    onChange={(e) =>
                      onFilterChange(field.id, e.target.value)
                    }
                    className="w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text
                      font-mono focus:outline-none focus:border-app-accent"
                  />
                )}

                {field.type === 'checkbox' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(field.value as string) === 'true'}
                      onChange={(e) =>
                        onFilterChange(field.id, e.target.checked ? 'true' : 'false')
                      }
                      className="w-4 h-4 border-2 border-app-text accent-app-text cursor-pointer"
                    />
                    <span className="text-sm text-app-text-muted">{field.label}</span>
                  </label>
                )}

                {field.type === 'multi-select' && (
                  <div className="space-y-1">
                    {field.options?.map((opt) => {
                      const values = (field.value as string[]) || [];
                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={values.includes(opt.value)}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...values, opt.value]
                                : values.filter((v) => v !== opt.value);
                              onFilterChange(field.id, newValues);
                            }}
                            className="w-4 h-4 border-2 border-app-text accent-app-text cursor-pointer"
                          />
                          <span className="text-sm text-app-text-muted">
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t-2 border-app-text">
            {onApply && (
              <BrutalButton onClick={onApply} className="flex-1">
                Apply
              </BrutalButton>
            )}
          </div>
        </BrutalCard>
      )}
    </div>
  );
};
