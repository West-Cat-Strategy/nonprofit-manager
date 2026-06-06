/**
 * Legacy form textarea export kept for route compatibility.
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
          <label className="block text-sm font-medium text-app-text-label">
            {label}
            {required && <span className="text-app-accent ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          className={`min-h-[120px] w-full rounded-[var(--ui-radius-sm)] border bg-app-input-bg px-3 py-2 text-sm text-app-text shadow-sm
            placeholder:text-app-text-subtle focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]
            disabled:bg-app-surface-muted disabled:cursor-not-allowed resize-none
            ${error || isOverLimit ? 'border-app-accent' : 'border-app-input-border'}
            ${className}`}
          {...props}
        />
        <div className="flex justify-between items-start">
          <div>
            {error && (
              <p className="text-xs font-medium text-red-600">{error}</p>
            )}
            {hint && !error && (
              <p className="text-xs text-app-text-muted">{hint}</p>
            )}
          </div>
          {charLimit && (
            <p
              className={`text-xs ${
                isOverLimit ? 'font-medium text-red-600' : 'text-app-text-muted'
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
