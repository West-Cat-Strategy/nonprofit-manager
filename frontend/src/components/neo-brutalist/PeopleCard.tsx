/**
 * PeopleCard - Reusable people card component
 * 
 * This component is data-driven and can render ANY person data passed to it.
 * Color, status, and role are ALL driven by props, not hard-coded logic.
 */

import type { AdaptedPerson, CardColor } from '../../types/schema';

interface PeopleCardProps {
    person: AdaptedPerson;
}

const CARD_COLORS: Record<CardColor, string> = {
    pink: 'bg-loop-pink text-app-text-heading',
    cyan: 'bg-loop-cyan text-app-text-heading',
    yellow: 'bg-loop-yellow text-app-text-heading',
    gray: 'bg-app-surface-elevated text-app-text',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    away: 'border-amber-200 bg-amber-50 text-amber-700',
    inactive: 'border-app-border-muted bg-app-surface-muted text-app-text-muted',
};

export default function PeopleCard({ person }: PeopleCardProps) {
    // Get card background color from data, fallback to white
    const cardBg = person.cardColor ? CARD_COLORS[person.cardColor] : 'bg-app-surface text-app-text';
    const headingTextClass = 'text-app-text-heading';
    const initialsTextClass = 'text-app-text-heading';
    const secondaryTextClass = 'text-app-text-muted';

    // Get status badge color
    const statusColor = STATUS_COLORS[person.status?.toLowerCase() || 'active'] || STATUS_COLORS.active;

    // Generate initials
    const firstName = person.firstName?.trim() || 'Unknown';
    const lastName = person.lastName?.trim() || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || 'U';
    const fullName = person.fullName?.trim() || `${firstName} ${lastName}`.trim();

    return (
        <div className={`${cardBg} flex flex-col items-center rounded-[var(--ui-radius-sm)] border border-app-border-muted p-5 shadow-sm`}>
            {/* Profile Photo Area - White circle with initials */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-elevated">
                <span className={`text-xl font-semibold ${initialsTextClass}`}>
                    {initials}
                </span>
            </div>

            {/* Name - Truncate to prevent overflow */}
            <h3 className={`mb-1 w-full max-w-full truncate px-2 text-center text-lg font-semibold ${headingTextClass}`}>
                {fullName}
            </h3>

            {/* Role/Title - Truncate to prevent overflow */}
            <p className={`mb-3 w-full max-w-full truncate px-2 text-center text-xs font-medium ${secondaryTextClass}`}>
                {person.title || person.role}
            </p>

            {/* Status Badge */}
            <div className="mb-4">
                <span className={`inline-flex items-center rounded-[var(--ui-radius-sm)] border px-2 py-0.5 text-xs font-semibold ${statusColor}`}>
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
