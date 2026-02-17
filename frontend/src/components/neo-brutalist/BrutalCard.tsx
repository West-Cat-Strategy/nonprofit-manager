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
        yellow: 'bg-loop-yellow',
        green: 'bg-loop-green',
        purple: 'bg-loop-purple',
        pink: 'bg-loop-pink',
        white: 'bg-white',
        black: 'bg-black text-white',
    };

    return (
        <div
            className={`
        border-brutal border-black shadow-brutal relative
        ${colorClasses[color]}
        ${onClick ? 'cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm transition-all z-10' : 'z-0'}
        ${className}
      `}
            onClick={onClick}
            style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
        >
            {children}
        </div>
    );
}
