/**
 * BrutalInput - Neo-Brutalist Input Component
 * Hard borders, no rounded corners
 */

import type { ChangeEvent, ReactNode } from 'react';

export interface BrutalInputProps {
    type?: 'text' | 'email' | 'password' | 'search';
    placeholder?: string;
    value?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    disabled?: boolean;
    icon?: ReactNode;
}

export default function BrutalInput({
    type = 'text',
    placeholder,
    value,
    onChange,
    className = '',
    disabled = false,
    icon,
}: BrutalInputProps) {
    return (
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {icon}
                </div>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`
          w-full border-brutal border-black px-4 py-2 
          bg-white text-black
          focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${icon ? 'pl-10' : ''}
          ${className}
        `}
            />
        </div>
    );
}
