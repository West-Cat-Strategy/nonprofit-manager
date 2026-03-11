/**
 * BrutalInput - Neo-Brutalist Input Component
 * Hard borders, no rounded corners
 */

import type { InputHTMLAttributes, ReactNode } from 'react';

export interface BrutalInputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: ReactNode;
}

export default function BrutalInput({
    icon,
    className = '',
    ...props
}: BrutalInputProps) {
    return (
        <div className={`relative ${className}`}>
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none">
                    {icon}
                </div>
            )}
            <input
                {...props}
                className={`
                    w-full border-2 border-[var(--app-input-border)] 
                    px-4 py-2 ${icon ? 'pl-10' : ''} 
                    bg-app-input-bg
                    text-app-text
                    placeholder:text-app-text-subtle
                    focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                `}
            />
        </div>
    );
}
