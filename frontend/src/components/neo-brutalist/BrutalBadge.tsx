/**
 * BrutalBadge - Neo-Brutalist Badge Component
 * Status indicators with hard borders
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
        green: 'bg-loop-green text-black border-black',
        yellow: 'bg-loop-yellow text-black border-black',
        red: 'bg-app-accent-soft text-[var(--app-text)] border-[var(--app-border)]',
        gray: 'bg-app-hover text-[var(--app-text)] border-[var(--app-border)]',
        purple: 'bg-loop-purple text-black border-black',
        blue: 'bg-app-accent-soft text-[var(--app-text)] border-[var(--app-border)]',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span
            className={`
        inline-block border-2 font-bold uppercase
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}
