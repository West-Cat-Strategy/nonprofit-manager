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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    {icon}
                </div>
            )}
            <input
                {...props}
                className={`
                    w-full border-2 border-black dark:border-white 
                    px-4 py-2 ${icon ? 'pl-10' : ''} 
                    bg-white dark:bg-[#000000] 
                    text-black dark:text-white 
                    focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                `}
            />
        </div>
    );
}
