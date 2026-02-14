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
          <label className="block text-sm font-bold text-gray-900">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full px-3 py-2 border-2 border-gray-900 bg-white text-gray-900 font-mono
              placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-0
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-600' : 'border-gray-900'}
              ${icon ? 'pl-10' : ''}
              ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-bold text-red-600">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

BrutalFormInput.displayName = 'BrutalFormInput';
