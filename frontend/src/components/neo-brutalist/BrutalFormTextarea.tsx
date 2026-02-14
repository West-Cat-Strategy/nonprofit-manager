/**
 * Neo-brutalist Form Textarea Component
 */

import React from 'react';

interface BrutalFormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  charLimit?: number;
}

export const BrutalFormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  BrutalFormTextareaProps
>(
  (
    { label, error, hint, required, charLimit, value = '', className = '', ...props },
    ref
  ) => {
    const charCount = String(value).length;
    const isOverLimit = charLimit && charCount > charLimit;

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-bold text-gray-900">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          className={`w-full px-3 py-2 border-2 border-gray-900 bg-white text-gray-900 font-mono
            placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-0
            disabled:bg-gray-100 disabled:cursor-not-allowed resize-none
            ${error || isOverLimit ? 'border-red-600' : 'border-gray-900'}
            ${className}`}
          {...props}
        />
        <div className="flex justify-between items-start">
          <div>
            {error && (
              <p className="text-xs font-bold text-red-600">{error}</p>
            )}
            {hint && !error && (
              <p className="text-xs text-gray-500">{hint}</p>
            )}
          </div>
          {charLimit && (
            <p
              className={`text-xs font-mono ${
                isOverLimit ? 'text-red-600 font-bold' : 'text-gray-500'
              }`}
            >
              {charCount}/{charLimit}
            </p>
          )}
        </div>
      </div>
    );
  }
);

BrutalFormTextarea.displayName = 'BrutalFormTextarea';
