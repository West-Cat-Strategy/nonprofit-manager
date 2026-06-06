/**
 * Legacy checkbox export kept for route compatibility.
 */

import React from 'react';

interface BrutalFormCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const BrutalFormCheckbox = React.forwardRef<
  HTMLInputElement,
  BrutalFormCheckboxProps
>(({ label, error, hint, ...props }, ref) => {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 h-5 w-5 rounded-[var(--ui-radius-xs)] border border-app-input-border bg-app-input-bg accent-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2
            cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        {label && (
          <span
            className={`text-sm font-medium text-app-text leading-relaxed ${
              error ? 'font-medium text-red-600' : ''
            }`}
          >
            {label}
          </span>
        )}
      </label>
      {error && (
        <p className="text-xs font-medium text-red-600 ml-7">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-app-text-muted ml-7">{hint}</p>
      )}
    </div>
  );
});

BrutalFormCheckbox.displayName = 'BrutalFormCheckbox';
