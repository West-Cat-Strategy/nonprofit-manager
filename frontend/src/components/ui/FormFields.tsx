import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { classNames } from './classNames';

const baseInputClass =
  'mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]';

interface FieldLabelProps {
  label: string;
  required?: boolean;
  helperText?: string;
  htmlFor: string;
}

function FieldLabel({ label, required, helperText, htmlFor }: FieldLabelProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-app-text-label">
        {label}
        {required && <span className="ml-1 text-app-accent">*</span>}
      </label>
      {helperText && <p className="text-xs text-app-text-subtle">{helperText}</p>}
    </div>
  );
}

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export function FormField({ label, helperText, id, required, className, ...props }: FormFieldProps) {
  const resolvedId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} helperText={helperText} htmlFor={resolvedId} />
      <input id={resolvedId} required={required} className={classNames(baseInputClass, className)} {...props} />
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
}

export function SelectField({ label, helperText, id, required, className, children, ...props }: SelectFieldProps) {
  const resolvedId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} helperText={helperText} htmlFor={resolvedId} />
      <select id={resolvedId} required={required} className={classNames(baseInputClass, className)} {...props}>
        {children}
      </select>
    </div>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
}

export function TextareaField({ label, helperText, id, required, className, ...props }: TextareaFieldProps) {
  const resolvedId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} helperText={helperText} htmlFor={resolvedId} />
      <textarea
        id={resolvedId}
        required={required}
        className={classNames(baseInputClass, 'min-h-[120px]', className)}
        {...props}
      />
    </div>
  );
}
