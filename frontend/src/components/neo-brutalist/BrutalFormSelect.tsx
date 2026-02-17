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
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text font-mono
            focus:outline-none focus:border-app-accent focus:ring-0 appearance-none cursor-pointer
            disabled:bg-app-surface-muted disabled:cursor-not-allowed
            ${error ? 'border-red-600' : 'border-app-text'}
            ${className}`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '28px',
          }}
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
          <p className="text-xs font-bold text-red-600">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-app-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

BrutalFormSelect.displayName = 'BrutalFormSelect';
