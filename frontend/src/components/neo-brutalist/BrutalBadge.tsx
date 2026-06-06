/**
 * Legacy badge export kept for route compatibility.
 * Renders as a compact Calm Ops status pill.
 */

import type { ReactNode } from 'react';

export interface BrutalBadgeProps {
    children: ReactNode;
    color?: 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'blue';
    size?: 'sm' | 'md';
    className?: string;
}

export default function BrutalBadge({
    children,
    color = 'gray',
    size = 'md',
    className = '',
}: BrutalBadgeProps) {
    const colorClasses = {
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        yellow: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-red-200 bg-red-50 text-red-700',
        gray: 'border-app-border-muted bg-app-surface-muted text-app-text-muted',
        purple: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span
            className={`
        inline-flex items-center rounded-[var(--ui-radius-sm)] border font-semibold
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}
