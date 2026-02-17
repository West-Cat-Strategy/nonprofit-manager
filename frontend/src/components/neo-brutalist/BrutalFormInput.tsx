/**
 * Neo-brutalist Form Input Component
 * Consistent form input styling
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
          <label className="block text-sm font-bold text-app-text">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
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
            className={`w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text font-mono
              placeholder-app-text-subtle focus:outline-none focus:border-app-accent focus:ring-0
              disabled:bg-app-surface-muted disabled:cursor-not-allowed
              ${error ? 'border-red-600' : 'border-app-text'}
              ${icon ? 'pl-10' : ''}
              ${className}`}
            {...props}
          />
        </div>
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

BrutalFormInput.displayName = 'BrutalFormInput';
