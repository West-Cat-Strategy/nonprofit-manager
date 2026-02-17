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
          <label className="block text-sm font-bold text-app-text">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          className={`w-full px-3 py-2 border-2 border-app-text bg-app-surface text-app-text font-mono
            placeholder-app-text-subtle focus:outline-none focus:border-app-accent focus:ring-0
            disabled:bg-app-surface-muted disabled:cursor-not-allowed resize-none
            ${error || isOverLimit ? 'border-red-600' : 'border-app-text'}
            ${className}`}
          {...props}
        />
        <div className="flex justify-between items-start">
          <div>
            {error && (
              <p className="text-xs font-bold text-red-600">{error}</p>
            )}
            {hint && !error && (
              <p className="text-xs text-app-text-muted">{hint}</p>
            )}
          </div>
          {charLimit && (
            <p
              className={`text-xs font-mono ${
                isOverLimit ? 'text-red-600 font-bold' : 'text-app-text-muted'
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
