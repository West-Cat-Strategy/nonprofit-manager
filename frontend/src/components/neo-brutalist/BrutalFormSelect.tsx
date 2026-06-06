/**
 * Legacy form select export kept for route compatibility.
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
          <label className="block text-sm font-medium text-app-text-label">
            {label}
            {required && <span className="text-app-accent ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`brutal-form-select min-h-10 w-full rounded-[var(--ui-radius-sm)] border bg-app-input-bg px-3 py-2 text-sm text-app-text shadow-sm
            focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-[var(--app-bg)] appearance-none cursor-pointer
            disabled:bg-app-surface-muted disabled:cursor-not-allowed
            ${error ? 'border-app-accent' : 'border-app-input-border'}
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
          <p className="text-xs font-medium text-red-600">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-app-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

BrutalFormSelect.displayName = 'BrutalFormSelect';
