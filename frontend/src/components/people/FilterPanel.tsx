/**
 * Advanced Filter Panel
 * Reusable filter component for list pages
 */

import React from 'react';
import { BrutalButton, BrutalCard } from './index';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
          className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600"
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white px-2 py-1 text-xs rounded">
              {activeFilterCount}
            </span>
          )}
        </button>
        {!isCollapsed && onClear && (
          <button
            onClick={onClear}
            className="text-sm text-gray-600 hover:text-gray-900 font-mono"
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
                <label className="block text-sm font-bold text-gray-900">
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
                    className="w-full px-3 py-2 border-2 border-gray-900 bg-white text-gray-900
                      font-mono placeholder-gray-400 focus:outline-none focus:border-blue-600"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={(field.value as string) || ''}
                    onChange={(e) =>
                      onFilterChange(field.id, e.target.value)
                    }
                    className="w-full px-3 py-2 border-2 border-gray-900 bg-white text-gray-900
                      font-mono focus:outline-none focus:border-blue-600 cursor-pointer"
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
                    className="w-full px-3 py-2 border-2 border-gray-900 bg-white text-gray-900
                      font-mono focus:outline-none focus:border-blue-600"
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
                      className="w-4 h-4 border-2 border-gray-900 accent-gray-900 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{field.label}</span>
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
                            className="w-4 h-4 border-2 border-gray-900 accent-gray-900 cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">
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
          <div className="flex gap-2 pt-4 border-t-2 border-gray-900">
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
