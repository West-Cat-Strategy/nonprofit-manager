/**
 * BrutalButton - Neo-Brutalist Button Component
 * Hard borders, brutal shadows, bold text
 */

import React from 'react';

export interface BrutalButtonProps {
    children: React.ReactNode;
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
        primary: 'bg-black text-white hover:bg-gray-800',
        secondary: 'bg-white text-black hover:bg-gray-100',
        success: 'bg-loop-green text-black hover:bg-green-400',
        danger: 'bg-red-500 text-white hover:bg-red-600',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
        border-brutal border-black shadow-brutal font-bold uppercase
        hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm
        transition-all
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
        >
            {children}
        </button>
    );
}
