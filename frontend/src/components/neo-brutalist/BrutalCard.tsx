/**
 * BrutalCard - Neo-Brutalist Card Component
 * Hard borders, directional shadows, no blur
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
        yellow: 'bg-loop-yellow text-black',
        green: 'bg-loop-green text-black',
        purple: 'bg-loop-purple text-black',
        pink: 'bg-loop-pink text-black',
        white: 'bg-app-surface text-app-text',
        black: 'bg-[var(--app-text-heading)] text-[var(--app-bg)]',
    };

    return (
        <div
            className={`
        border-brutal border-[var(--app-border)] shadow-brutal relative break-words
        ${colorClasses[color]}
        ${onClick ? 'cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm transition-all z-10' : 'z-0'}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
