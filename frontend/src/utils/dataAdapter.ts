/**
 * Data Adapter - Black Box API Strategy
 * 
 * This utility adapts unknown backend data structures to a standardized UI format.
 * Since we don't know if the API uses "volunteers", "members", "contacts", etc.,
 * we detect and map fields dynamically.
 * 
 * DEPRECATED: This file is being phased out in favor of types/schema.ts
 * Kept for backward compatibility during migration.
 */

import type { MockPerson } from './mockData';
import type { AdaptedPerson } from '../types/schema';

// Re-export AdaptedPerson from schema for backward compatibility
export type { AdaptedPerson };

/**
 * Adapts API response to standardized People format
 * Logs original data for debugging
 */
export function adaptPeopleData(apiResponse: unknown): AdaptedPerson[] {
    console.group('[LOOP Data Adapter] People Data');
    console.log('Raw API Response:', apiResponse);

    // Handle different response structures
    let dataArray: unknown[] = [];
    const response = apiResponse as Record<string, unknown> | null;

    if (Array.isArray(apiResponse)) {
        dataArray = apiResponse;
    } else if (response?.data) {
        dataArray = Array.isArray(response.data) ? (response.data as unknown[]) : [];
    } else if (response?.volunteers) {
        dataArray = Array.isArray(response.volunteers) ? (response.volunteers as unknown[]) : [];
    } else if (response?.members) {
        dataArray = Array.isArray(response.members) ? (response.members as unknown[]) : [];
    } else if (response?.contacts) {
        dataArray = Array.isArray(response.contacts) ? (response.contacts as unknown[]) : [];
    }

    console.log(`Detected ${dataArray.length} records`);

    const getString = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        return undefined;
    };

    const adapted = dataArray.map((rawItem) => {
        const item = rawItem as Record<string, unknown>;
        // Map ID field (could be volunteer_id, member_id, contact_id, user_id, id)
        const id = getString(item.volunteer_id)
            || getString(item.member_id)
            || getString(item.contact_id)
            || getString(item.user_id)
            || getString(item.id)
            || `unknown-${Math.random()}`;

        // Map name fields
        const firstName = getString(item.first_name)
            || getString(item.firstName)
            || getString(item.fname)
            || 'Unknown';
        const lastName = getString(item.last_name)
            || getString(item.lastName)
            || getString(item.lname)
            || '';

        // Map contact fields
        const email = getString(item.email)
            || getString(item.email_address)
            || getString(item.contact_email)
            || '';
        const phone = getString(item.phone)
            || getString(item.mobile_phone)
            || getString(item.phone_number)
            || getString(item.phoneNumber)
            || undefined;

        // Map role/status fields
        const role = getString(item.role)
            || getString(item.volunteer_role)
            || getString(item.position)
            || undefined;
        const status = getString(item.status)
            || getString(item.availability_status)
            || getString(item.active_status)
            || undefined;
        const title = getString(item.title) || getString(item.job_title) || undefined;

        return {
            id,
            firstName,
            lastName,
            email,
            phone,
            role,
            status,
            title,
            fullName: `${firstName} ${lastName}`.trim(),
        };
    });

    console.log('Adapted People:', adapted);
    console.groupEnd();

    return adapted;
}

/**
 * Adapts mock data to the same format for consistency
 */
export function adaptMockPeople(mockData: MockPerson[]): AdaptedPerson[] {
    return mockData.map(person => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        role: person.role,
        status: person.status,
        title: person.title,
        fullName: `${person.firstName} ${person.lastName}`,
        cardColor: person.cardColor, // Include card color from data
    }));
}

/**
 * Filter people by role
 */
export function filterPeopleByRole(
    people: AdaptedPerson[],
    role: 'staff' | 'volunteer' | 'board' | 'all'
): AdaptedPerson[] {
    if (role === 'all') return people;
    return people.filter(person => person.role === role);
}

/**
 * Get status badge color for Neo-Brutalist UI
 */
export function getStatusColor(status?: string): string {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'available':
            return 'green';
        case 'away':
        case 'limited':
            return 'yellow';
        case 'inactive':
        case 'unavailable':
            return 'gray';
        default:
            return 'gray';
    }
}

/**
 * Get role badge color for LOOP design system
 */
export function getRoleColor(role?: string): string {
    switch (role?.toLowerCase()) {
        case 'staff':
            return 'loop-pink';
        case 'volunteer':
            return 'loop-green';
        case 'board':
            return 'loop-purple';
        default:
            return 'gray-400';
    }
}
