import { useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { classNames } from './classNames';

const baseInputClass =
  'mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]';

interface FieldLabelProps {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  htmlFor: string;
}

function FieldLabel({ label, required, helperText, error, htmlFor }: FieldLabelProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wide text-app-text-label"
      >
        {label}
        {required && <span className="ml-1 text-app-accent">*</span>}
      </label>
      {helperText && (
        <p id={`${htmlFor}-help`} className="text-xs text-app-text-subtle">
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function buildFieldId(label: string, name: string | undefined, fallbackId: string): string {
  const sanitizedLabel = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
  return name || `${sanitizedLabel || 'field'}-${fallbackId.replace(/:/g, '')}`;
}

function buildDescribedBy(
  existing: string | undefined,
  helperId: string | undefined,
  errorId: string | undefined
): string | undefined {
  return [existing, helperId, errorId].filter(Boolean).join(' ') || undefined;
}

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function FormField({
  label,
  helperText,
  error,
  id,
  required,
  className,
  ...props
}: FormFieldProps) {
  const reactId = useId();
  const resolvedId = id || buildFieldId(label, props.name, reactId);
  const helperId = helperText ? `${resolvedId}-help` : undefined;
  const errorId = error ? `${resolvedId}-error` : undefined;
  const describedBy = buildDescribedBy(props['aria-describedby'], helperId, errorId);
  const { ['aria-describedby']: _ariaDescribedBy, ['aria-invalid']: _ariaInvalid, ...inputProps } =
    props;

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label={label}
        required={required}
        helperText={helperText}
        error={error}
        htmlFor={resolvedId}
      />
      <input
        id={resolvedId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={classNames(baseInputClass, className)}
        {...inputProps}
      />
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function SelectField({
  label,
  helperText,
  error,
  id,
  required,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const reactId = useId();
  const resolvedId = id || buildFieldId(label, props.name, reactId);
  const helperId = helperText ? `${resolvedId}-help` : undefined;
  const errorId = error ? `${resolvedId}-error` : undefined;
  const describedBy = buildDescribedBy(props['aria-describedby'], helperId, errorId);
  const { ['aria-describedby']: _ariaDescribedBy, ['aria-invalid']: _ariaInvalid, ...selectProps } =
    props;

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label={label}
        required={required}
        helperText={helperText}
        error={error}
        htmlFor={resolvedId}
      />
      <select
        id={resolvedId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={classNames(baseInputClass, className)}
        {...selectProps}
      >
        {children}
      </select>
    </div>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function TextareaField({
  label,
  helperText,
  error,
  id,
  required,
  className,
  ...props
}: TextareaFieldProps) {
  const reactId = useId();
  const resolvedId = id || buildFieldId(label, props.name, reactId);
  const helperId = helperText ? `${resolvedId}-help` : undefined;
  const errorId = error ? `${resolvedId}-error` : undefined;
  const describedBy = buildDescribedBy(props['aria-describedby'], helperId, errorId);
  const { ['aria-describedby']: _ariaDescribedBy, ['aria-invalid']: _ariaInvalid, ...textareaProps } =
    props;

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label={label}
        required={required}
        helperText={helperText}
        error={error}
        htmlFor={resolvedId}
      />
      <textarea
        id={resolvedId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={classNames(baseInputClass, 'min-h-[120px]', className)}
        {...textareaProps}
      />
    </div>
  );
}
