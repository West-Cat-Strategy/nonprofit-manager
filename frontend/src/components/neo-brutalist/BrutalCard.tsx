/**
 * Legacy card export kept for route compatibility.
 * Renders as a Calm Ops panel with restrained borders and elevation.
 */

import type { ReactNode } from 'react';

export interface BrutalCardProps {
    children: ReactNode;
    color?: 'yellow' | 'green' | 'purple' | 'pink' | 'white' | 'black';
    className?: string;
    onClick?: () => void;
}

export default function BrutalCard({
    children,
    color = 'white',
    className = '',
    onClick
}: BrutalCardProps) {
    const colorClasses = {
        yellow: 'bg-loop-yellow text-app-text-heading',
        green: 'bg-loop-green text-app-text-heading',
        purple: 'bg-loop-purple text-app-text-heading',
        pink: 'bg-loop-pink text-app-text-heading',
        white: 'bg-app-surface text-app-text',
        black: 'bg-app-surface-elevated text-app-text-heading',
    };

    return (
        <div
            className={`
        relative break-words rounded-[var(--ui-radius-sm)] border border-app-border-muted shadow-sm
        ${colorClasses[color]}
        ${onClick ? 'z-10 cursor-pointer transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2' : 'z-0'}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
