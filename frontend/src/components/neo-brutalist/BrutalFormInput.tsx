/**
 * Legacy form input export kept for route compatibility.
 */

import React from 'react';

interface BrutalFormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const BrutalFormInput = React.forwardRef<
  HTMLInputElement,
  BrutalFormInputProps
>(
  (
    { label, error, hint, required, icon, className = '', ...props },
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
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`min-h-10 w-full rounded-[var(--ui-radius-sm)] border bg-app-input-bg px-3 py-2 text-sm text-app-text shadow-sm
              placeholder:text-app-text-subtle focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]
              disabled:bg-app-surface-muted disabled:cursor-not-allowed
              ${error ? 'border-app-accent' : 'border-app-input-border'}
              ${icon ? 'pl-10' : ''}
              ${className}`}
            {...props}
          />
        </div>
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

BrutalFormInput.displayName = 'BrutalFormInput';
