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

import type { MockPerson, CardColor } from './mockData';
import type { AdaptedPerson } from '../types/schema';

// Re-export AdaptedPerson from schema for backward compatibility
export type { AdaptedPerson };

/**
 * Adapts API response to standardized People format
 * Logs original data for debugging
 */
export function adaptPeopleData(apiResponse: any): AdaptedPerson[] {
    console.group('[LOOP Data Adapter] People Data');
    console.log('Raw API Response:', apiResponse);

    // Handle different response structures
    let dataArray: any[] = [];

    if (Array.isArray(apiResponse)) {
        dataArray = apiResponse;
    } else if (apiResponse?.data) {
        dataArray = Array.isArray(apiResponse.data) ? apiResponse.data : [];
    } else if (apiResponse?.volunteers) {
        dataArray = Array.isArray(apiResponse.volunteers) ? apiResponse.volunteers : [];
    } else if (apiResponse?.members) {
        dataArray = Array.isArray(apiResponse.members) ? apiResponse.members : [];
    } else if (apiResponse?.contacts) {
        dataArray = Array.isArray(apiResponse.contacts) ? apiResponse.contacts : [];
    }

    console.log(`Detected ${dataArray.length} records`);

    const adapted = dataArray.map((item: any) => {
        // Map ID field (could be volunteer_id, member_id, contact_id, user_id, id)
        const id = item.volunteer_id || item.member_id || item.contact_id ||
            item.user_id || item.id || `unknown-${Math.random()}`;

        // Map name fields
        const firstName = item.first_name || item.firstName || item.fname || 'Unknown';
        const lastName = item.last_name || item.lastName || item.lname || '';

        // Map contact fields
        const email = item.email || item.email_address || item.contact_email || '';
        const phone = item.phone || item.mobile_phone || item.phone_number ||
            item.phoneNumber || undefined;

        // Map role/status fields
        const role = item.role || item.volunteer_role || item.position || undefined;
        const status = item.status || item.availability_status || item.active_status || undefined;
        const title = item.title || item.job_title || undefined;

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
