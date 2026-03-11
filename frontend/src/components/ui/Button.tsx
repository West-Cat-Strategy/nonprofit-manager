import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from './classNames';

type ButtonTone = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  leadingIcon?: ReactNode;
}

const toneClasses: Record<ButtonTone, string> = {
  primary:
    'bg-app-accent text-[var(--app-accent-foreground)] border border-app-accent hover:bg-app-accent-hover hover:border-app-accent-hover',
  secondary:
    'bg-app-surface text-app-text border border-app-border hover:bg-app-hover',
  danger:
    'bg-app-accent text-[var(--app-accent-foreground)] border border-app-accent hover:bg-app-accent-hover hover:border-app-accent',
};

const disabledToneClasses: Record<ButtonTone, string> = {
  primary:
    'bg-app-surface-muted text-app-text-muted border border-app-border-muted hover:bg-app-surface-muted hover:border-app-border-muted',
  secondary:
    'bg-app-surface-muted text-app-text-muted border border-app-border-muted hover:bg-app-surface-muted',
  danger:
    'bg-app-surface-muted text-app-text-muted border border-app-border-muted hover:bg-app-surface-muted hover:border-app-border-muted',
};

export default function Button({
  tone = 'primary',
  leadingIcon,
  className,
  children,
  type = 'button',
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] px-4 py-2 text-sm font-semibold shadow-sm',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed disabled:shadow-none',
        toneClasses[tone],
        disabled && disabledToneClasses[tone],
        className
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'tone'>) {
  return <Button tone="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'tone'>) {
  return <Button tone="secondary" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, 'tone'>) {
  return <Button tone="danger" {...props} />;
}
