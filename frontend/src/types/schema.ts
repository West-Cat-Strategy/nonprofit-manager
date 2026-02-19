/**
 * LOOP Data Schema Definitions
 * Central type contracts for backend integration
 * 
 * Based on Interaction Audit Report - Phase 1 Implementation
 */

// ============================================================================
// PEOPLE & USER TYPES
// ============================================================================

/**
 * Person Interface - Standardized across all people-related entities
 * Used by: PeopleDirectory, Dashboard, Various modules
 */
export interface AdaptedPerson {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: 'staff' | 'volunteer' | 'board';
    status?: 'active' | 'away' | 'inactive';
    title?: string;
    fullName: string;
    cardColor?: CardColor;
}

/**
 * User Profile - Settings module data
 * Extended profile information for authenticated user
 */
export interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    emailSharedWithClients: boolean;
    emailSharedWithUsers: boolean;
    alternativeEmails?: AlternativeEmail[];
    displayName: string;
    alternativeName: string;
    pronouns: string;
    title: string;
    cellPhone: string;
    contactNumber?: string;
    profilePicture: string | null;
    notifications: NotificationSettings;
}

export interface AlternativeEmail {
    email: string;
    label: string;
    isVerified: boolean;
}

export interface NotificationSettings {
    emailNotifications: boolean;
    taskReminders: boolean;
    eventReminders: boolean;
    donationAlerts: boolean;
    caseUpdates: boolean;
    weeklyDigest: boolean;
    marketingEmails: boolean;
}

// ============================================================================
// ORGANIZATION TYPES (Linking Module)
// ============================================================================

/**
 * Organization Interface - Partnership management
 * Used by: LinkingModule (Partnerships)
 */
export interface Organization {
    id: string;
    name: string;
    type: 'partner' | 'government' | 'grantor';
    status: 'active' | 'pending' | 'review';
    contact: string;
}

// ============================================================================
// TASK TYPES (Operations Module)
// ============================================================================

/**
 * Task Interface - Kanban board operations
 * Used by: OperationsBoard (Kanban)
 */
export interface Task {
    id: string;
    title: string;
    category: 'hr' | 'admin' | 'finance' | 'tech';
    status: 'todo' | 'in-progress' | 'done';
    dueDate?: string;
    assignees?: string[];
}

// ============================================================================
// CAMPAIGN & EVENT TYPES (Outreach Module)
// ============================================================================

/**
 * Campaign Event Interface - Outreach scheduling
 * Used by: OutreachCenter (Campaigns/Schedule)
 */
export interface CampaignEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    rsvpCount: number;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

/**
 * Dashboard Statistics - Overview metrics
 * Used by: NeoBrutalistDashboard
 */
export interface DashboardStats {
    pendingTasks: number;
    newPeopleRequests: number;
    activePartners: number;
    opsEfficiency: number;
    reach: number;
    totalPeople: number;
}

/**
 * Campaign Statistics - Outreach metrics
 * Used by: OutreachCenter
 */
export interface CampaignStats {
    peopleEngaged: number;
    newsletterSubs: string;
    upcomingEvents: string;
    activeDonors: string;
    socialHandle: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * People Filter Parameters
 * Used in getPeople() service method
 */
export interface PeopleFilter {
    role?: 'staff' | 'volunteer' | 'board';
    query?: string;
    status?: 'active' | 'away' | 'inactive';
}

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T> {
    data: T;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
    };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CardColor = 'pink' | 'cyan' | 'yellow' | 'gray';
export type PersonRole = 'staff' | 'volunteer' | 'board';
export type PersonStatus = 'active' | 'away' | 'inactive';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskCategory = 'hr' | 'admin' | 'finance' | 'tech';
export type OrganizationType = 'partner' | 'government' | 'grantor';
export type OrganizationStatus = 'active' | 'pending' | 'review';
