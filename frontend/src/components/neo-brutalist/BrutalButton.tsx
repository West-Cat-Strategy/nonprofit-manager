/**
 * Legacy button export kept for route compatibility.
 * Renders with the Calm Ops interaction style.
 */

import type { ReactNode } from 'react';

export interface BrutalButtonProps {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
}

export default function BrutalButton({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    disabled = false,
}: BrutalButtonProps) {
    const variantClasses = {
        primary: 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover hover:border-app-accent-hover',
        secondary: 'border-app-border-muted bg-app-surface text-app-text hover:bg-app-hover hover:text-app-text-heading',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    };
    const disabledClasses = 'bg-app-surface-muted text-app-text-muted border-app-border-muted shadow-none';

    const sizeClasses = {
        sm: 'min-h-9 px-3 py-1.5 text-sm',
        md: 'min-h-10 px-4 py-2 text-sm',
        lg: 'min-h-11 px-5 py-2.5 text-base',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-disabled={disabled}
            className={`
        inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border font-semibold shadow-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]
        transition-all
        disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${disabled ? disabledClasses : ''}
        ${sizeClasses[size]}
        ${className}
      `}
        >
            {children}
        </button>
    );
}
