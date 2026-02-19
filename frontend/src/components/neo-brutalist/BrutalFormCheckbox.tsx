/**
 * Neo-brutalist Form Checkbox Component
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
          className="w-5 h-5 border-2 border-app-text bg-app-surface accent-app-text focus:outline-none
            cursor-pointer mt-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        {label && (
          <span
            className={`text-sm font-medium text-app-text leading-relaxed ${
              error ? 'text-red-600 font-bold' : ''
            }`}
          >
            {label}
          </span>
        )}
      </label>
      {error && (
        <p className="text-xs font-bold text-red-600 ml-7">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-app-text-muted ml-7">{hint}</p>
      )}
    </div>
  );
});

BrutalFormCheckbox.displayName = 'BrutalFormCheckbox';
