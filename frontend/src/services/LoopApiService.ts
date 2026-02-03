/**
 * LOOP API Service Layer
 * 
 * Unified service class for all backend interactions.
 * Phase 1: Returns mock data with simulated network latency (500ms)
 * Phase 2: Will swap to real fetch() calls without breaking UI
 * 
 * Architecture:
 * - All methods are async to simulate real API behavior
 * - Centralized error handling
 * - Type-safe with schema.ts contracts
 */

import type {
    AdaptedPerson,
    Organization,
    Task,
    CampaignEvent,
    UserProfile,
    DashboardStats,
    CampaignStats,
    PeopleFilter,
} from '../types/schema';

import {
    mockPeople,
    mockOrganizations,
    mockTasks,
    mockCampaignEvents,
    mockDashboardStats,
    mockCampaignStats,
} from '../utils/mockData';

import { adaptMockPeople } from '../utils/dataAdapter';

/**
 * Simulated network latency in milliseconds
 * Makes the UI feel more realistic and tests loading states
 */
const SIMULATED_LATENCY = 500;

/**
 * Helper: Simulate async network request
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * LOOP API Service Class
 * Singleton pattern for consistent API access across the application
 */
class LoopApiService {
    // ============================================================================
    // PEOPLE MANAGEMENT
    // ============================================================================

    /**
     * Fetch people with optional filters
     * @param filter - Role, search query, status filters
     * @returns Promise<AdaptedPerson[]>
     */
    async getPeople(filter?: PeopleFilter): Promise<AdaptedPerson[]> {
        await delay(SIMULATED_LATENCY);

        // Adapt mock data to standard format
        let people = adaptMockPeople(mockPeople);

        // Apply role filter
        if (filter?.role) {
            people = people.filter(person => person.role === filter.role);
        }

        // Apply search query (firstName, lastName, email)
        if (filter?.query && filter.query.trim() !== '') {
            const query = filter.query.toLowerCase();
            people = people.filter(person =>
                person.firstName.toLowerCase().includes(query) ||
                person.lastName.toLowerCase().includes(query) ||
                person.email.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (filter?.status) {
            people = people.filter(person => person.status === filter.status);
        }

        console.log('[LoopApiService] getPeople:', { filter, resultCount: people.length });
        return people;
    }

    /**
     * Update a person's information
     * @param id - Person ID
     * @param data - Partial person data to update
     * @returns Promise<AdaptedPerson>
     */
    async updatePerson(id: string, data: Partial<AdaptedPerson>): Promise<AdaptedPerson> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2, this will be: return fetch(`/api/people/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        const mockPerson = mockPeople.find(p => p.id === id);
        if (!mockPerson) {
            throw new Error(`Person with id ${id} not found`);
        }

        const updated = { ...mockPerson, ...data };
        console.log('[LoopApiService] updatePerson:', { id, data, updated });

        return adaptMockPeople([updated])[0];
    }

    /**
     * Create a new person
     * @param data - New person data
     * @returns Promise<AdaptedPerson>
     */
    async createPerson(data: Omit<AdaptedPerson, 'id' | 'fullName'>): Promise<AdaptedPerson> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/api/people', { method: 'POST', body: JSON.stringify(data) })
        const newPerson: AdaptedPerson = {
            ...data,
            id: `person-${Date.now()}`,
            fullName: `${data.firstName} ${data.lastName}`,
        };

        console.log('[LoopApiService] createPerson:', newPerson);
        return newPerson;
    }

    // ============================================================================
    // USER PROFILE (Settings Module)
    // ============================================================================

    /**
     * Get current user's profile
     * @returns Promise<UserProfile>
     */
    async getUserProfile(): Promise<UserProfile> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/auth/profile')
        // For now, return mock profile data
        const mockProfile: UserProfile = {
            firstName: 'Sora',
            lastName: 'Keyblade',
            email: 'sora@destinyislands.org',
            emailSharedWithClients: false,
            emailSharedWithUsers: true,
            displayName: 'Sora K.',
            alternativeName: '',
            pronouns: 'he/him',
            title: 'Executive Director',
            cellPhone: '(555) 001-0001',
            profilePicture: null,
            notifications: {
                emailNotifications: true,
                taskReminders: true,
                eventReminders: true,
                donationAlerts: true,
                caseUpdates: true,
                weeklyDigest: false,
                marketingEmails: false,
            },
        };

        console.log('[LoopApiService] getUserProfile:', mockProfile);
        return mockProfile;
    }

    /**
     * Update current user's profile
     * @param data - User profile data
     * @returns Promise<UserProfile>
     */
    async updateUserProfile(data: UserProfile): Promise<UserProfile> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) })
        console.log('[LoopApiService] updateUserProfile:', data);

        // Simulate successful save
        return data;
    }

    // ============================================================================
    // DASHBOARD STATISTICS
    // ============================================================================

    /**
     * Get dashboard overview statistics
     * @returns Promise<DashboardStats>
     */
    async getDashboardStats(): Promise<DashboardStats> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/api/dashboard/stats')
        const stats: DashboardStats = {
            pendingTasks: mockDashboardStats.pendingTasks,
            newPeopleRequests: mockDashboardStats.newPeopleRequests,
            activePartners: mockDashboardStats.activePartners,
            opsEfficiency: mockDashboardStats.opsEfficiency,
            reach: mockDashboardStats.campaignReach,
            totalPeople: mockDashboardStats.totalPeople,
        };

        console.log('[LoopApiService] getDashboardStats:', stats);
        return stats;
    }

    /**
     * Get campaign/outreach statistics
     * @returns Promise<CampaignStats>
     */
    async getCampaignStats(): Promise<CampaignStats> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/api/campaigns/stats')
        console.log('[LoopApiService] getCampaignStats:', mockCampaignStats);
        return mockCampaignStats;
    }

    // ============================================================================
    // ORGANIZATIONS (Linking Module)
    // ============================================================================

    /**
     * Get all organizations
     * @returns Promise<Organization[]>
     */
    async getOrganizations(): Promise<Organization[]> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/api/organizations')
        console.log('[LoopApiService] getOrganizations:', mockOrganizations);
        return mockOrganizations;
    }

    // ============================================================================
    // TASKS (Operations Module)
    // ============================================================================

    /**
     * Get all tasks
     * @returns Promise<Task[]>
     */
    async getTasks(): Promise<Task[]> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/api/tasks')
        console.log('[LoopApiService] getTasks:', mockTasks);
        return mockTasks;
    }

    // ============================================================================
    // EVENTS (Outreach Module)
    // ============================================================================

    /**
     * Get campaign events
     * @returns Promise<CampaignEvent[]>
     */
    async getCampaignEvents(): Promise<CampaignEvent[]> {
        await delay(SIMULATED_LATENCY);

        // In Phase 2: return fetch('/api/events')
        console.log('[LoopApiService] getCampaignEvents:', mockCampaignEvents);
        return mockCampaignEvents;
    }
}

// Export singleton instance
export default new LoopApiService();
