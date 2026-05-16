import React, { useId } from 'react';

interface PropertyPanelFieldProps {
  children: (id: string) => React.ReactNode;
  label: string;
  id?: string;
  className?: string;
  labelClassName?: string;
}

export function PropertyPanelField({
  children,
  label,
  id,
  className,
  labelClassName = 'mb-1 block text-sm font-medium text-app-text-muted',
}: PropertyPanelFieldProps) {
  const generatedId = useId();
  const fieldId = id || `property-panel-${generatedId}`;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className={labelClassName}>
        {label}
      </label>
      {children(fieldId)}
    </div>
  );
}

interface PropertyPanelCheckboxProps {
  checked: boolean;
  label: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}

export function PropertyPanelCheckbox({
  checked,
  disabled = false,
  label,
  onChange,
}: PropertyPanelCheckboxProps) {
  const generatedId = useId();
  const fieldId = `property-panel-${generatedId}`;

  return (
    <label htmlFor={fieldId} className="flex items-center gap-2 text-sm">
      <input
        id={fieldId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="rounded border-app-input-border"
      />
      {label}
    </label>
  );
}
