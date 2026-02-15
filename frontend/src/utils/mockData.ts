/**
 * Mock Data - Professional Nonprofit Dataset
 * High-volume test data for Neo-Brutalist UI
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
    cardColor: CardColor;
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

// Professional Staff & Volunteers - 15 People
export const mockPeople: MockPerson[] = [
    {
        id: '1',
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 's.chen@global-edu.org',
        phone: '(555) 123-4567',
        role: 'staff',
        status: 'active',
        title: 'Executive Director',
        cardColor: 'pink',
    },
    {
        id: '2',
        firstName: 'Marcus',
        lastName: 'Johnson',
        email: 'm.johnson@global-edu.org',
        phone: '(555) 234-5678',
        role: 'staff',
        status: 'active',
        title: 'Operations Manager',
        cardColor: 'pink',
    },
    {
        id: '3',
        firstName: 'Elena',
        lastName: 'Rodriguez',
        email: 'e.rodriguez@global-edu.org',
        phone: '(555) 345-6789',
        role: 'staff',
        status: 'active',
        title: 'Community Outreach Lead',
        cardColor: 'pink',
    },
    {
        id: '4',
        firstName: 'David',
        lastName: 'Kim',
        email: 'd.kim@global-edu.org',
        phone: '(555) 456-7890',
        role: 'staff',
        status: 'active',
        title: 'Program Director',
        cardColor: 'pink',
    },
    {
        id: '5',
        firstName: 'Olivia',
        lastName: 'Wilson',
        email: 'o.wilson@global-edu.org',
        phone: '(555) 567-8901',
        role: 'staff',
        status: 'away',
        title: 'Field Coordinator',
        cardColor: 'pink',
    },
    {
        id: '6',
        firstName: 'James',
        lastName: 'Taylor',
        email: 'j.taylor@volunteers.org',
        phone: '(555) 678-9012',
        role: 'volunteer',
        status: 'active',
        title: 'Volunteer Lead',
        cardColor: 'yellow',
    },
    {
        id: '7',
        firstName: 'Sophia',
        lastName: 'Brown',
        email: 's.brown@volunteers.org',
        phone: '(555) 789-0123',
        role: 'volunteer',
        status: 'active',
        title: 'Event Coordinator',
        cardColor: 'yellow',
    },
    {
        id: '8',
        firstName: 'Michael',
        lastName: 'Davis',
        email: 'm.davis@volunteers.org',
        phone: '(555) 890-1234',
        role: 'volunteer',
        status: 'active',
        title: 'Logistics Volunteer',
        cardColor: 'yellow',
    },
    {
        id: '9',
        firstName: 'Emily',
        lastName: 'Miller',
        email: 'e.miller@volunteers.org',
        phone: '(555) 901-2345',
        role: 'volunteer',
        status: 'active',
        title: 'Communications Volunteer',
        cardColor: 'yellow',
    },
    {
        id: '10',
        firstName: 'Robert',
        lastName: 'Garcia',
        email: 'r.garcia@volunteers.org',
        phone: '(555) 012-3456',
        role: 'volunteer',
        status: 'inactive',
        title: 'Research Volunteer',
        cardColor: 'yellow',
    },
    {
        id: '11',
        firstName: 'Linda',
        lastName: 'Smith',
        email: 'l.smith@board.org',
        phone: '(555) 123-0001',
        role: 'board',
        status: 'active',
        title: 'Board Chair',
        cardColor: 'gray',
    },
    {
        id: '12',
        firstName: 'William',
        lastName: 'Anderson',
        email: 'w.anderson@board.org',
        phone: '(555) 123-0002',
        role: 'board',
        status: 'active',
        title: 'Board Treasurer',
        cardColor: 'gray',
    },
    {
        id: '13',
        firstName: 'Elizabeth',
        lastName: 'Thomas',
        email: 'e.thomas@board.org',
        phone: '(555) 123-0003',
        role: 'board',
        status: 'active',
        title: 'Board Secretary',
        cardColor: 'gray',
    },
    {
        id: '14',
        firstName: 'Richard',
        lastName: 'Moore',
        email: 'r.moore@board.org',
        phone: '(555) 123-0004',
        role: 'board',
        status: 'active',
        title: 'Board Member',
        cardColor: 'gray',
    },
    {
        id: '15',
        firstName: 'Jessica',
        lastName: 'Jackson',
        email: 'j.jackson@board.org',
        phone: '(555) 123-0005',
        role: 'board',
        status: 'active',
        title: 'Board Member',
        cardColor: 'gray',
    },
];

// Organizations - 6 Partners & Grantors
export const mockOrganizations: MockOrganization[] = [
    {
        id: '1',
        name: 'Global Education Initiative',
        type: 'partner',
        status: 'active',
        contact: 'Sarah Chen',
    },
    {
        id: '2',
        name: 'Coastal Wildlife Trust',
        type: 'government',
        status: 'active',
        contact: 'Marcus Johnson',
    },
    {
        id: '3',
        name: 'Heritage Grant Foundation',
        type: 'grantor',
        status: 'active',
        contact: 'Linda Smith',
    },
    {
        id: '4',
        name: 'Urban Renewal Project',
        type: 'partner',
        status: 'pending',
        contact: 'Elena Rodriguez',
    },
    {
        id: '5',
        name: 'Pacific Sustainability Institute',
        type: 'partner',
        status: 'review',
        contact: 'David Kim',
    },
    {
        id: '6',
        name: 'Community Housing Alliance',
        type: 'government',
        status: 'active',
        contact: 'Marcus Johnson',
    },
];

// Tasks - 8 Operational Tasks
export const mockTasks: MockTask[] = [
    {
        id: '1',
        title: 'Q1 Financial Audit',
        category: 'finance',
        status: 'in-progress',
        dueDate: 'Due in 3 days',
        assignees: ['William Anderson'],
    },
    {
        id: '2',
        title: 'Volunteer Orientation Session',
        category: 'hr',
        status: 'todo',
        dueDate: 'Due next week',
        assignees: ['James Taylor'],
    },
    {
        id: '3',
        title: 'Grant Proposal - Youth Arts',
        category: 'finance',
        status: 'in-progress',
        dueDate: 'Due in 5 days',
        assignees: ['Sarah Chen'],
    },
    {
        id: '4',
        title: 'IT Infrastructure Review',
        category: 'tech',
        status: 'todo',
        dueDate: 'Due next month',
        assignees: ['Marcus Johnson'],
    },
    {
        id: '5',
        title: 'Annual Impact Report',
        category: 'admin',
        status: 'in-progress',
        dueDate: 'Due this week',
        assignees: ['Elena Rodriguez'],
    },
    {
        id: '6',
        title: 'CRM Database Cleanup',
        category: 'tech',
        status: 'done',
        assignees: ['Elena Rodriguez'],
    },
    {
        id: '7',
        title: 'Board Meeting Prep',
        category: 'admin',
        status: 'in-progress',
        dueDate: 'Ongoing',
        assignees: ['Linda Smith', 'Sarah Chen'],
    },
    {
        id: '8',
        title: 'Sustainability Campaign',
        category: 'finance',
        status: 'done',
        assignees: ['David Kim'],
    },
];

// Events - 4 Resource Events
export const mockCampaignEvents: MockCampaignEvent[] = [
    {
        id: '1',
        title: 'Annual Charity Auction',
        date: 'AUG 15',
        time: '14:00 - 18:00',
        rsvpCount: 287,
    },
    {
        id: '2',
        title: 'Community Garden Workshop',
        date: 'SEP 3',
        time: '19:00 - 23:00',
        rsvpCount: 456,
    },
    {
        id: '3',
        title: 'Sustainability Summit',
        date: 'SEP 20',
        time: '10:00 - 16:00',
        rsvpCount: 623,
    },
    {
        id: '4',
        title: 'Winter Gala',
        date: 'OCT 7',
        time: '12:00 - 20:00',
        rsvpCount: 892,
    },
];

// Dashboard Stats
export const mockDashboardStats = {
    pendingTasks: 5,
    newPeopleRequests: 12,
    activePartners: 24,
    opsEfficiency: 92,
    reach: 3400,
    totalPeople: 850,
};

// Campaign Stats
export const mockCampaignStats = {
    peopleEngaged: 12504,
    newsletterSubs: '2.5k Subs',
    upcomingEvents: '3 Upcoming',
    activeDonors: 'Active Drive',
    socialHandle: '@nonprofit_manager',
};
