/**
 * Mock Data for Neo-Brutalist UI Development
 * Using screenshot-specific names for immediate visual verification
 */

export type CardColor = 'pink' | 'cyan' | 'yellow' | 'gray';

export interface MockPerson {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: 'staff' | 'volunteer' | 'board';
    status: 'active' | 'away' | 'inactive';
    title: string;
    avatarUrl?: string;
    cardColor: CardColor; // Visual theme color for Neo-Brutalist cards
}

export interface MockOrganization {
    id: string;
    name: string;
    type: 'partner' | 'government' | 'grantor';
    status: 'active' | 'pending' | 'review';
    contact: string;
}

export interface MockTask {
    id: string;
    title: string;
    category: 'hr' | 'admin' | 'finance' | 'tech';
    status: 'todo' | 'in-progress' | 'done';
    dueDate?: string;
    assignees?: string[];
}

export interface MockCampaignEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    rsvpCount: number;
}

// People - Matching screenshot examples with assigned card colors
export const mockPeople: MockPerson[] = [
    {
        id: '1',
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'priya.patel@loop.org',
        phone: '(555) 123-4567',
        role: 'staff',
        status: 'active',
        title: 'Executive Director',
        cardColor: 'pink', // Staff - Pink card
    },
    {
        id: '2',
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james.wilson@loop.org',
        phone: '(555) 234-5678',
        role: 'staff',
        status: 'away',
        title: 'Ops Manager',
        cardColor: 'cyan', // Ops Manager - Cyan card
    },
    {
        id: '3',
        firstName: 'Mia',
        lastName: 'Torres',
        email: 'mia.torres@loop.org',
        phone: '(555) 345-6789',
        role: 'volunteer',
        status: 'active',
        title: 'Volunteer Lead',
        cardColor: 'yellow', // Volunteer - Yellow card
    },
    {
        id: '4',
        firstName: 'Eleanor',
        lastName: 'Rigby',
        email: 'eleanor.rigby@loop.org',
        phone: '(555) 456-7890',
        role: 'board',
        status: 'inactive',
        title: 'Board Member',
        cardColor: 'gray', // Inactive board - Gray card
    },
    {
        id: '5',
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        email: 'carlos.r@loop.org',
        role: 'volunteer',
        status: 'active',
        title: 'Community Outreach',
        cardColor: 'cyan', // Volunteer - Cyan card
    },
    {
        id: '6',
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@loop.org',
        role: 'staff',
        status: 'active',
        title: 'Program Director',
        cardColor: 'pink', // Staff - Pink card
    },
];

// Organizations - Matching screenshot names
export const mockOrganizations: MockOrganization[] = [
    {
        id: '1',
        name: 'Urban Food Alliance',
        type: 'partner',
        status: 'active',
        contact: 'Sarah J.',
    },
    {
        id: '2',
        name: 'City Council',
        type: 'government',
        status: 'pending',
        contact: 'Mark R.',
    },
    {
        id: '3',
        name: 'Tech For Good',
        type: 'grantor',
        status: 'review',
        contact: 'David K.',
    },
];

// Tasks - Matching screenshot content
export const mockTasks: MockTask[] = [
    {
        id: '1',
        title: 'Volunteer Training Guide',
        category: 'hr',
        status: 'todo',
        dueDate: 'Due in 3 days',
    },
    {
        id: '2',
        title: 'Annual Report Drafting',
        category: 'admin',
        status: 'todo',
        dueDate: 'Due next week',
    },
    {
        id: '3',
        title: 'Q1 Financial Audit',
        category: 'finance',
        status: 'in-progress',
        assignees: ['Finance Team'],
    },
    {
        id: '4',
        title: 'Grant App #402',
        category: 'finance',
        status: 'in-progress',
    },
    {
        id: '5',
        title: 'Website Redesign',
        category: 'tech',
        status: 'done',
    },
];

// Campaign Events
export const mockCampaignEvents: MockCampaignEvent[] = [
    {
        id: '1',
        title: 'Summer Fundraiser Gala',
        date: 'AUG 15',
        time: '18:00 - 22:00',
        rsvpCount: 142,
    },
    {
        id: '2',
        title: 'Community Town Hall',
        date: 'AUG 22',
        time: '14:00 - 16:00',
        rsvpCount: 89,
    },
];

// Dashboard Stats
export const mockDashboardStats = {
    pendingTasks: 3,
    newPeopleRequests: 5,
    activePartners: 12,
    opsEfficiency: '85%',
    reach: '1.2k',
    totalPeople: 340,
};

// Campaign Stats
export const mockCampaignStats = {
    peopleEngaged: 12504,
    newsletterSubs: '2.5k Subs',
    upcomingEvents: '3 Upcoming',
    activeDonors: 'Active Drive',
    socialHandle: '@Handle',
};
