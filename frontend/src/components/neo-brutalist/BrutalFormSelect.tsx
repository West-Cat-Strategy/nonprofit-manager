/**
 * Neo-brutalist Form Select Component
 * Consistent dropdown styling
 */

import React from 'react';

interface BrutalFormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export const BrutalFormSelect = React.forwardRef<
  HTMLSelectElement,
  BrutalFormSelectProps
>(
  (
    { label, error, hint, required, options = [], className = '', children, ...props },
    ref
  ) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-bold text-app-text">
            {label}
            {required && <span className="text-app-accent ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`brutal-form-select w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text font-mono
            focus:outline-none focus:border-app-accent focus:ring-0 appearance-none cursor-pointer
            disabled:bg-app-surface-muted disabled:cursor-not-allowed
            ${error ? 'border-app-accent' : 'border-app-text'}
            ${className}`}
          {...props}
        >
          {children}
          {options.length > 0 &&
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
        {error && (
          <p className="text-xs font-bold text-app-accent">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-app-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

BrutalFormSelect.displayName = 'BrutalFormSelect';
