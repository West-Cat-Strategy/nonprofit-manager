import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from './classNames';

type ButtonTone = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  leadingIcon?: ReactNode;
}

const toneClasses: Record<ButtonTone, string> = {
  primary:
    'bg-[var(--app-accent)] text-[var(--app-accent-foreground)] border border-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] hover:border-[var(--app-accent-hover)]',
  secondary:
    'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-hover)]',
  danger:
    'bg-[var(--app-accent)] text-[var(--app-accent-foreground)] border border-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] hover:border-[var(--app-accent-hover)]',
};

const disabledToneClasses: Record<ButtonTone, string> = {
  primary:
    'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] border border-[var(--app-border-muted)] hover:bg-[var(--app-surface-muted)] hover:border-[var(--app-border-muted)]',
  secondary:
    'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] border border-[var(--app-border-muted)] hover:bg-[var(--app-surface-muted)] hover:border-[var(--app-border-muted)]',
  danger:
    'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] border border-[var(--app-border-muted)] hover:bg-[var(--app-surface-muted)] hover:border-[var(--app-border-muted)]',
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
