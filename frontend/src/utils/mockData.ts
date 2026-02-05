/**
 * Mock Data - Kingdom Hearts Dataset
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

// Kingdom Hearts Characters - 15 People
export const mockPeople: MockPerson[] = [
    {
        id: '1',
        firstName: 'Sora',
        lastName: 'Keyblade',
        email: 'sora@destinyislands.org',
        phone: '(555) 001-0001',
        role: 'staff',
        status: 'active',
        title: 'Executive Director',
        cardColor: 'pink',
    },
    {
        id: '2',
        firstName: 'Riku',
        lastName: 'Dawn',
        email: 'riku@destinyislands.org',
        phone: '(555) 001-0002',
        role: 'staff',
        status: 'active',
        title: 'Operations Manager',
        cardColor: 'pink',
    },
    {
        id: '3',
        firstName: 'Kairi',
        lastName: 'Light',
        email: 'kairi@destinyislands.org',
        phone: '(555) 001-0003',
        role: 'staff',
        status: 'active',
        title: 'Community Outreach Lead',
        cardColor: 'pink',
    },
    {
        id: '4',
        firstName: 'Aqua',
        lastName: 'Wayfinder',
        email: 'aqua@landofdeparture.org',
        phone: '(555) 001-0004',
        role: 'staff',
        status: 'active',
        title: 'Program Director',
        cardColor: 'pink',
    },
    {
        id: '5',
        firstName: 'Terra',
        lastName: 'Guardian',
        email: 'terra@landofdeparture.org',
        phone: '(555) 001-0005',
        role: 'staff',
        status: 'away',
        title: 'Field Coordinator',
        cardColor: 'pink',
    },
    {
        id: '6',
        firstName: 'Ventus',
        lastName: 'Wind',
        email: 'ventus@landofdeparture.org',
        phone: '(555) 001-0006',
        role: 'volunteer',
        status: 'active',
        title: 'Volunteer Lead',
        cardColor: 'yellow',
    },
    {
        id: '7',
        firstName: 'Roxas',
        lastName: 'Twilight',
        email: 'roxas@twilighttown.org',
        phone: '(555) 001-0007',
        role: 'volunteer',
        status: 'active',
        title: 'Event Coordinator',
        cardColor: 'yellow',
    },
    {
        id: '8',
        firstName: 'Axel',
        lastName: 'Flame',
        email: 'axel@twilighttown.org',
        phone: '(555) 001-0008',
        role: 'volunteer',
        status: 'active',
        title: 'Logistics Volunteer',
        cardColor: 'yellow',
    },
    {
        id: '9',
        firstName: 'Naminé',
        lastName: 'Memory',
        email: 'namine@castleoblivion.org',
        phone: '(555) 001-0009',
        role: 'volunteer',
        status: 'active',
        title: 'Communications Volunteer',
        cardColor: 'yellow',
    },
    {
        id: '10',
        firstName: 'Xion',
        lastName: 'Replica',
        email: 'xion@organization13.org',
        phone: '(555) 001-0010',
        role: 'volunteer',
        status: 'inactive',
        title: 'Research Volunteer',
        cardColor: 'yellow',
    },
    {
        id: '11',
        firstName: 'Mickey',
        lastName: 'Mouse',
        email: 'mickey@disneycastle.org',
        phone: '(555) 001-0011',
        role: 'board',
        status: 'active',
        title: 'Board Chair',
        cardColor: 'gray',
    },
    {
        id: '12',
        firstName: 'Donald',
        lastName: 'Duck',
        email: 'donald@disneycastle.org',
        phone: '(555) 001-0012',
        role: 'board',
        status: 'active',
        title: 'Board Treasurer',
        cardColor: 'gray',
    },
    {
        id: '13',
        firstName: 'Goofy',
        lastName: 'Goof',
        email: 'goofy@disneycastle.org',
        phone: '(555) 001-0013',
        role: 'board',
        status: 'active',
        title: 'Board Secretary',
        cardColor: 'gray',
    },
    {
        id: '14',
        firstName: 'Leon',
        lastName: 'Squall',
        email: 'leon@hollowbastion.org',
        phone: '(555) 001-0014',
        role: 'board',
        status: 'active',
        title: 'Board Member',
        cardColor: 'gray',
    },
    {
        id: '15',
        firstName: 'Yuffie',
        lastName: 'Kisaragi',
        email: 'yuffie@hollowbastion.org',
        phone: '(555) 001-0015',
        role: 'board',
        status: 'active',
        title: 'Board Member',
        cardColor: 'gray',
    },
];

// Organizations - 6 Kingdom Hearts Worlds
export const mockOrganizations: MockOrganization[] = [
    {
        id: '1',
        name: 'Destiny Islands Foundation',
        type: 'partner',
        status: 'active',
        contact: 'Sora K.',
    },
    {
        id: '2',
        name: 'Radiant Garden Council',
        type: 'government',
        status: 'active',
        contact: 'Leon S.',
    },
    {
        id: '3',
        name: 'Disney Castle Trust',
        type: 'grantor',
        status: 'active',
        contact: 'Mickey M.',
    },
    {
        id: '4',
        name: 'Twilight Town Alliance',
        type: 'partner',
        status: 'pending',
        contact: 'Roxas T.',
    },
    {
        id: '5',
        name: 'Land of Departure Institute',
        type: 'partner',
        status: 'review',
        contact: 'Aqua W.',
    },
    {
        id: '6',
        name: 'Hollow Bastion Restoration',
        type: 'government',
        status: 'active',
        contact: 'Yuffie K.',
    },
];

// Tasks - 8 Kingdom Hearts Missions
export const mockTasks: MockTask[] = [
    {
        id: '1',
        title: 'Keyblade Training Program',
        category: 'hr',
        status: 'in-progress',
        dueDate: 'Due in 3 days',
        assignees: ['Sora', 'Riku'],
    },
    {
        id: '2',
        title: 'Heartless Defense Strategy',
        category: 'admin',
        status: 'todo',
        dueDate: 'Due next week',
        assignees: ['Terra', 'Aqua'],
    },
    {
        id: '3',
        title: 'Munny Grant Application',
        category: 'finance',
        status: 'in-progress',
        dueDate: 'Due in 5 days',
        assignees: ['Donald'],
    },
    {
        id: '4',
        title: 'Gummi Ship Maintenance',
        category: 'tech',
        status: 'todo',
        dueDate: 'Due next month',
        assignees: ['Goofy', 'Chip', 'Dale'],
    },
    {
        id: '5',
        title: 'World Restoration Report',
        category: 'admin',
        status: 'in-progress',
        dueDate: 'Due this week',
        assignees: ['Leon', 'Yuffie'],
    },
    {
        id: '6',
        title: 'Memory Archive Update',
        category: 'tech',
        status: 'done',
        assignees: ['Naminé'],
    },
    {
        id: '7',
        title: 'Organization XIII Monitoring',
        category: 'admin',
        status: 'in-progress',
        dueDate: 'Ongoing',
        assignees: ['Riku', 'Mickey'],
    },
    {
        id: '8',
        title: 'Light Gathering Campaign',
        category: 'finance',
        status: 'done',
        assignees: ['Kairi', 'Aqua'],
    },
];

// Events - 4 Kingdom Hearts Gatherings
export const mockCampaignEvents: MockCampaignEvent[] = [
    {
        id: '1',
        title: 'Keyblade War Memorial',
        date: 'AUG 15',
        time: '14:00 - 18:00',
        rsvpCount: 287,
    },
    {
        id: '2',
        title: 'Worlds United Gala',
        date: 'SEP 3',
        time: '19:00 - 23:00',
        rsvpCount: 456,
    },
    {
        id: '3',
        title: 'Heartless Awareness Day',
        date: 'SEP 20',
        time: '10:00 - 16:00',
        rsvpCount: 623,
    },
    {
        id: '4',
        title: 'Light Festival',
        date: 'OCT 7',
        time: '12:00 - 20:00',
        rsvpCount: 892,
    },
];

// Dashboard Stats - Kingdom Hearts Scale
export const mockDashboardStats = {
    pendingTasks: 5,
    newPeopleRequests: 12,
    activePartners: 24,
    opsEfficiency: 92,
    reach: 3400,
    totalPeople: 850,
};

// Campaign Stats - Outreach Center Metrics
export const mockCampaignStats = {
    peopleEngaged: 12504,
    newsletterSubs: '2.5k Subs',
    upcomingEvents: '3 Upcoming',
    activeDonors: 'Active Drive',
    socialHandle: '@Handle',
};
