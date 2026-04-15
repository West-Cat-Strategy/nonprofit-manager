/**
 * PeopleCard - Reusable Neo-Brutalist People Card Component
 * 
 * This component is data-driven and can render ANY person data passed to it.
 * Color, status, and role are ALL driven by props, not hard-coded logic.
 */

import type { AdaptedPerson, CardColor } from '../../types/schema';

interface PeopleCardProps {
    person: AdaptedPerson;
}

// Color mapping for Neo-Brutalist design system
const CARD_COLORS: Record<CardColor, string> = {
    pink: 'bg-loop-pink text-[var(--app-brutal-ink)]',
    cyan: 'bg-loop-cyan text-[var(--app-brutal-ink)]',
    yellow: 'bg-loop-yellow text-[var(--app-brutal-ink)]',
    gray: 'bg-app-surface text-app-text',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-loop-green text-[var(--app-brutal-ink)] border-[var(--app-brutal-outline)]',
    away: 'bg-app-surface text-app-text border-app-border',
    inactive: 'bg-app-surface text-app-text border-app-border',
};

export default function PeopleCard({ person }: PeopleCardProps) {
    // Get card background color from data, fallback to white
    const cardBg = person.cardColor ? CARD_COLORS[person.cardColor] : 'bg-app-surface text-app-text';
    const usesLoopSurface = person.cardColor !== undefined && person.cardColor !== 'gray';
    const secondaryTextClass = usesLoopSurface ? 'text-[var(--app-brutal-ink-muted)]' : 'text-app-text-muted';

    // Get status badge color
    const statusColor = STATUS_COLORS[person.status?.toLowerCase() || 'active'] || STATUS_COLORS.active;

    // Generate initials
    const firstName = person.firstName?.trim() || 'Unknown';
    const lastName = person.lastName?.trim() || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || 'U';
    const fullName = person.fullName?.trim() || `${firstName} ${lastName}`.trim();

    return (
        <div className={`${cardBg} border-2 border-app-border shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 flex flex-col items-center`}>
            {/* Profile Photo Area - White circle with initials */}
            <div className="w-20 h-20 bg-app-surface-elevated border-2 border-app-border rounded-full flex items-center justify-center mb-4 overflow-hidden">
                <span className="text-2xl font-black text-app-text">
                    {initials}
                </span>
            </div>

            {/* Name - Truncate to prevent overflow */}
            <h3 className="font-black text-lg mb-1 text-center truncate w-full max-w-full px-2">{fullName}</h3>

            {/* Role/Title - Truncate to prevent overflow */}
            <p className={`text-xs mb-3 uppercase font-bold tracking-wide text-center truncate w-full max-w-full px-2 ${secondaryTextClass}`}>
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
                <div className={`text-xs truncate mb-1 text-center w-full ${secondaryTextClass}`}>{person.email}</div>
            )}
            {person.phone && (
                <div className={`text-xs text-center ${secondaryTextClass}`}>{person.phone}</div>
            )}
        </div>
    );
}
