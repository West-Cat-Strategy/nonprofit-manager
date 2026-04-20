import type {
  AdaptedPerson,
  CampaignEvent,
  CampaignStats,
  Organization,
  PeopleFilter,
  Task,
} from '../../types/schema';

const cloneTasks = (tasks: Task[]): Task[] =>
  tasks.map((task) => ({
    ...task,
    assignees: task.assignees ? [...task.assignees] : undefined,
  }));

const cloneCampaignEvents = (events: CampaignEvent[]): CampaignEvent[] =>
  events.map((event) => ({ ...event }));

const cloneOrganizations = (organizations: Organization[]): Organization[] =>
  organizations.map((organization) => ({ ...organization }));

const clonePeople = (people: AdaptedPerson[]): AdaptedPerson[] =>
  people.map((person) => ({ ...person }));

export const isDemoPath = (pathname: string): boolean => pathname.startsWith('/demo/');

export const getDemoTasks = (): Task[] =>
  cloneTasks([
    {
      id: 'demo-task-1',
      title: 'Demo inbox triage',
      category: 'admin',
      status: 'todo',
      dueDate: '2026-04-21',
      assignees: ['Avery'],
    },
    {
      id: 'demo-task-2',
      title: 'Demo donor follow-up',
      category: 'finance',
      status: 'in-progress',
      dueDate: '2026-04-20',
      assignees: ['Jordan'],
    },
    {
      id: 'demo-task-3',
      title: 'Demo volunteer roster refresh',
      category: 'hr',
      status: 'done',
      assignees: ['Sam'],
    },
    {
      id: 'demo-task-4',
      title: 'Demo site health check',
      category: 'tech',
      status: 'todo',
    },
  ]);

export const getDemoCampaignStats = (): CampaignStats => ({
  peopleEngaged: 1234,
  newsletterSubs: '456',
  upcomingEvents: '7',
  activeDonors: '89',
  socialHandle: '@westcat',
});

export const getDemoCampaignEvents = (): CampaignEvent[] =>
  cloneCampaignEvents([
    {
      id: 'demo-event-1',
      title: 'Demo Spring Community Night',
      date: 'Apr 17, 2026',
      time: '6:00 PM',
      rsvpCount: 24,
    },
    {
      id: 'demo-event-2',
      title: 'Demo Volunteer Welcome',
      date: 'Apr 22, 2026',
      time: '4:30 PM',
      rsvpCount: 11,
    },
  ]);

const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: 'demo-org-1',
    name: 'River City Mutual Aid',
    type: 'partner',
    status: 'active',
    contact: 'hello@rivercitymutual.org',
  },
  {
    id: 'demo-org-2',
    name: 'North Shore Housing Office',
    type: 'government',
    status: 'review',
    contact: 'liaison@northshore.gov',
  },
  {
    id: 'demo-org-3',
    name: 'Harbor Light Foundation',
    type: 'grantor',
    status: 'pending',
    contact: 'programs@harborlight.ca',
  },
];

const DEMO_PEOPLE: AdaptedPerson[] = [
  {
    id: 'demo-person-1',
    firstName: 'Avery',
    lastName: 'Stone',
    email: 'avery.stone@example.org',
    phone: '604-555-0101',
    role: 'staff',
    status: 'active',
    title: 'Outreach Lead',
    fullName: 'Avery Stone',
    cardColor: 'pink',
  },
  {
    id: 'demo-person-2',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@example.org',
    phone: '604-555-0102',
    role: 'staff',
    status: 'active',
    title: 'Volunteer Coordinator',
    fullName: 'Jordan Lee',
    cardColor: 'cyan',
  },
  {
    id: 'demo-person-3',
    firstName: 'Sam',
    lastName: 'Nguyen',
    email: 'sam.nguyen@example.org',
    phone: '604-555-0103',
    role: 'volunteer',
    status: 'active',
    title: 'Community Volunteer',
    fullName: 'Sam Nguyen',
    cardColor: 'yellow',
  },
  {
    id: 'demo-person-4',
    firstName: 'Riley',
    lastName: 'Chen',
    email: 'riley.chen@example.org',
    phone: '604-555-0104',
    role: 'board',
    status: 'active',
    title: 'Board Chair',
    fullName: 'Riley Chen',
    cardColor: 'gray',
  },
];

export const getDemoOrganizations = (): Organization[] => cloneOrganizations(DEMO_ORGANIZATIONS);

export const getDemoPeople = (filter?: PeopleFilter): AdaptedPerson[] => {
  const normalizedQuery = filter?.query?.trim().toLowerCase() ?? '';

  return clonePeople(DEMO_PEOPLE).filter((person) => {
    if (filter?.role && person.role !== filter.role) {
      return false;
    }

    if (filter?.status && person.status !== filter.status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      person.fullName,
      person.firstName,
      person.lastName,
      person.email,
      person.phone,
      person.title,
      person.role,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
};
