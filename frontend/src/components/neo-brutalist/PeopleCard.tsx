/**
 * PeopleCard - Reusable Neo-Brutalist People Card Component
 * 
 * This component is data-driven and can render ANY person data passed to it.
 * Color, status, and role are ALL driven by props, not hard-coded logic.
 */

import React from 'react';
import type { AdaptedPerson } from '../../utils/dataAdapter';
import type { CardColor } from '../../utils/mockData';

interface PeopleCardProps {
    person: AdaptedPerson;
}

// Color mapping for Neo-Brutalist design system
const CARD_COLORS: Record<CardColor, string> = {
    pink: 'bg-[#FFB6C1]',
    cyan: 'bg-[#4DD0E1]',
    yellow: 'bg-[#FFD700]',
    gray: 'bg-[#E0E0E0]',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-[#90EE90] text-black border-black',
    away: 'bg-white text-black border-black',
    inactive: 'bg-white text-black border-black',
};

export default function PeopleCard({ person }: PeopleCardProps) {
    // Get card background color from data, fallback to white
    const cardBg = person.cardColor ? CARD_COLORS[person.cardColor] : 'bg-white';

    // Get status badge color
    const statusColor = STATUS_COLORS[person.status?.toLowerCase() || 'active'] || STATUS_COLORS.active;

    // Generate initials
    const initials = `${person.firstName[0]}${person.lastName[0]}`;

    return (
        <div className={`${cardBg} border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 flex flex-col items-center`}>
            {/* Profile Photo Area - White circle with initials */}
            <div className="w-20 h-20 bg-white border-2 border-black rounded-full flex items-center justify-center mb-4 overflow-hidden">
                <span className="text-2xl font-black text-black">
                    {initials}
                </span>
            </div>

            {/* Name */}
            <h3 className="font-black text-lg mb-1 text-center">{person.fullName}</h3>

            {/* Role/Title */}
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 uppercase font-bold tracking-wide text-center">
                {person.title || person.role}
            </p>

            {/* Status Badge */}
            <div className="mb-4">
                <span className={`text-xs font-bold uppercase px-3 py-1 border-2 ${statusColor}`}>
                    {person.status || 'ACTIVE'}
                </span>
            </div>

            {/* Contact Info */}
            {person.email && (
                <div className="text-xs text-gray-700 dark:text-gray-300 truncate mb-1 text-center w-full">{person.email}</div>
            )}
            {person.phone && (
                <div className="text-xs text-gray-700 dark:text-gray-300 text-center">{person.phone}</div>
            )}
        </div>
    );
}
